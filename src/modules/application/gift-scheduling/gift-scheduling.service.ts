import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGiftSchedulingDto } from './dto/create-gift-scheduling.dto';
import { UpdateGiftSchedulingDto } from './dto/update-gift-scheduling.dto';
import { FilterGiftSchedulingDto } from './dto/filter-gift-scheduling.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EncryptionHelper } from 'src/common/helper/encryption.helper';
import { MailService } from 'src/mail/mail.service';
import { GiftSchedulingMailService } from './mail/gift-scheduling-mail.service';
import { BirthdayCalculatorService } from './birthday-calculator.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import dayjs from 'dayjs';

@Injectable()
export class GiftSchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly giftSchedulingMailService: GiftSchedulingMailService,
    private readonly birthdayCalculator: BirthdayCalculatorService,
  ) {}

  /**
   * Main method that handles payment-first gift scheduling
   */
  async createWithPayment(
    createDto: CreateGiftSchedulingDto,
    user_id: string,
    payment_method_id: string,
  ) {
    try {
      // 1. Validate input data
      const validationResult = await this.validateGiftSchedulingData(
        createDto,
        user_id,
      );
      if (!validationResult.success) {
        return validationResult;
      }

      const { recipient, card, sendGiftDate, delay } = validationResult.data;

      // 2. Get user's billing information
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
        select: { billing_id: true, email: true, name: true },
      });

      if (!user?.billing_id) {
        return {
          success: false,
          message:
            'User billing information not found. Please contact support.',
        };
      }

      // 3. Process payment first
      const paymentResult = await this.processPayment({
        amount: createDto.amount,
        customer_id: user.billing_id,
        payment_method_id: payment_method_id,
        metadata: {
          user_id: user_id,
          vendor_id: createDto.vendor_id,
          recipient_email: createDto.recipient.email,
          gift_type: 'scheduled_gift',
        },
      });

      if (!paymentResult.success) {
        return paymentResult;
      }

      // 4. Create schedule after successful payment
      const scheduleResult = await this.createScheduleAfterPayment({
        createDto,
        user_id,
        recipient,
        card,
        sendGiftDate,
        delay,
        payment_intent_id: paymentResult.data.payment_intent_id,
      });

      return scheduleResult;
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
        details: {
          vendor_id: createDto.vendor_id,
          amount: createDto.amount,
          recipient_email: createDto.recipient.email,
        },
      };
    }
  }

  /**
   * Validate gift scheduling data and find required resources
   */
  private async validateGiftSchedulingData(
    createDto: CreateGiftSchedulingDto,
    user_id: string,
  ) {
    try {
      // 1. Validate recipient's birthday format
      const birthdayStr = createDto.recipient.birthday;
      const birthday = dayjs(birthdayStr, 'YYYY-MM-DD', true);

      if (!birthday.isValid()) {
        return {
          success: false,
          message: 'Invalid birthday format. Please use YYYY-MM-DD.',
        };
      }

      // 2. Validate send_gift_date format
      const sendGiftDateStr = createDto.send_gift_date;
      const sendGiftDate = dayjs(sendGiftDateStr, 'YYYY-MM-DD', true);

      if (!sendGiftDate.isValid()) {
        return {
          success: false,
          message: 'Invalid send gift date format. Please use YYYY-MM-DD.',
        };
      }

      // 3. Find or create recipient
      let recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          email: createDto.recipient.email,
        },
      });

      if (!recipient) {
        recipient = await this.prisma.giftRecipient.create({
          data: {
            user: { connect: { id: user_id } },
            name: createDto.recipient.name,
            email: createDto.recipient.email,
            birthday_date: birthday.toDate(),
          },
        });
      } else {
        // Update recipient if needed
        const updateData: any = {};
        if (recipient.name !== createDto.recipient.name) {
          updateData.name = createDto.recipient.name;
        }
        if (
          recipient.birthday_date &&
          dayjs(recipient.birthday_date).format('YYYY-MM-DD') !== birthdayStr
        ) {
          updateData.birthday_date = birthday.toDate();
        }
        if (Object.keys(updateData).length > 0) {
          recipient = await this.prisma.giftRecipient.update({
            where: { id: recipient.id },
            data: updateData,
          });
        }
      }

      // 4. Calculate delay
      const delay = this.birthdayCalculator.getDelayUntilNextBirthday(
        sendGiftDate.toDate(),
      );

      // 5. Find available inventory
      const card = await this.prisma.giftCardInventory.findFirst({
        where: {
          vendor_id: createDto.vendor_id,
          face_value: createDto.amount,
          status: 'AVAILABLE',
        },
        include: { vendor: true },
      });

      if (!card) {
        return {
          success: false,
          message: 'No available gift card for this vendor and amount',
        };
      }

      return {
        success: true,
        data: {
          recipient,
          card,
          sendGiftDate,
          delay,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Process payment using Stripe
   */
  private async processPayment({
    amount,
    customer_id,
    payment_method_id,
    metadata,
  }: {
    amount: number;
    customer_id: string;
    payment_method_id: string;
    metadata: any;
  }) {
    try {
      const paymentIntent = await StripePayment.createPaymentWithPaymentMethod({
        amount: amount,
        currency: 'usd',
        customer_id: customer_id,
        payment_method_id: payment_method_id,
        metadata: metadata,
      });

      // Log payment transaction
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: metadata.user_id,
          reference_number: paymentIntent.id,
          status: paymentIntent.status,
          raw_status: paymentIntent.status,
          amount: amount,
          currency: 'usd',
          paid_amount: paymentIntent.amount / 100,
          paid_currency: paymentIntent.currency,
          provider: 'stripe',
          type: 'gift_scheduling',
          transaction_category: 'USER_SALE',
        },
      });

      return {
        success: true,
        data: {
          payment_intent_id: paymentIntent.id,
          payment_status: paymentIntent.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Payment failed: ${error.message}`,
      };
    }
  }

  /**
   * Create schedule after successful payment
   */
  private async createScheduleAfterPayment({
    createDto,
    user_id,
    recipient,
    card,
    sendGiftDate,
    delay,
    payment_intent_id,
  }: {
    createDto: CreateGiftSchedulingDto;
    user_id: string;
    recipient: any;
    card: any;
    sendGiftDate: any;
    delay: number;
    payment_intent_id: string;
  }) {
    try {
      // 1. Find or create the Gift record
      let gift = await this.prisma.gift.findFirst({
        where: { inventory_id: card.id },
      });

      if (!gift) {
        gift = await this.prisma.gift.create({
          data: { inventory: { connect: { id: card.id } } },
        });
      }

      // 2. Create schedule
      const schedule = await this.prisma.giftScheduling.create({
        data: {
          user: { connect: { id: user_id } },
          recipient: { connect: { id: recipient.id } },
          gift: { connect: { id: gift.id } },
          inventory: { connect: { id: card.id } },
          scheduled_date: sendGiftDate.toDate(),
          custom_message: createDto.custom_message,
          delivery_status: 'PENDING',
          delivery_email: recipient.email,
          is_notify: createDto.is_notify ?? true,
        },
      });

      // 3. Reserve the card
      await this.prisma.giftCardInventory.update({
        where: { id: card.id },
        data: { status: 'RESERVED' },
      });

      // 4. Update payment transaction with inventory reference
      await this.prisma.paymentTransaction.updateMany({
        where: { reference_number: payment_intent_id },
        data: { inventory_id: card.id },
      });

      // 5. Send email
      const sender = await this.prisma.user.findUnique({
        where: { id: user_id },
        select: { name: true, email: true },
      });

      const decryptedCode = EncryptionHelper.decrypt(card.card_code);

      await this.giftSchedulingMailService.sendGiftEmail({
        to: recipient.email,
        recipient_name: recipient.name,
        sender_name: sender?.name || sender?.email || 'Someone',
        sender_email: sender?.email || '',
        vendor_name: card.vendor.name,
        face_value: Number(card.face_value),
        scheduled_date: schedule.scheduled_date,
        custom_message: schedule.custom_message,
        gift_card_code: decryptedCode,
        user_id: user_id,
        gift_scheduling_id: schedule.id,
        delay: delay,
        is_notify: schedule.is_notify,
      });

      return {
        success: true,
        message: 'Gift scheduled successfully after payment confirmation',
        data: {
          schedule_id: schedule.id,
          payment_intent_id: payment_intent_id,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create schedule after payment: ${error.message}`,
      };
    }
  }

  async findAll(filter: any, user_id: string) {
    try {
      const { offset, limit } = filter;
      const where = {
        user_id,
        ...(filter.recipient_id && { recipient_id: filter.recipient_id }),
        ...(filter.delivery_status && {
          delivery_status: filter.delivery_status,
        }),
        ...(filter.scheduled_date_from && {
          scheduled_date: { gte: filter.scheduled_date_from },
        }),
        ...(filter.scheduled_date_to && {
          scheduled_date: { lte: filter.scheduled_date_to },
        }),
      };

      const [data, total] = await this.prisma.$transaction([
        this.prisma.giftScheduling.findMany({
          where,
          skip: offset,
          take: limit,
        }),
        this.prisma.giftScheduling.count({ where }),
      ]);

      // Map to user-friendly output
      const result = data.map((schedule) => ({
        id: schedule.id,
        recipient_id: schedule.recipient_id,
        vendor_id: schedule.inventory_id,
        face_value: undefined,
        scheduled_date: schedule.scheduled_date,
        delivery_status: schedule.delivery_status,
        sent_at: schedule.sent_at,
        custom_message: schedule.custom_message,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
      }));

      return {
        success: true,
        data: result,
        total,
        offset,
        limit,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }

  async findOne(id: string, user_id: string) {
    try {
      const schedule = await this.prisma.giftScheduling.findFirst({
        where: {
          id,
          user_id,
        },
      });

      if (!schedule) {
        return {
          success: false,
          message: 'Scheduled gift not found',
        };
      }

      return {
        success: true,
        data: {
          id: schedule.id,
          recipient_id: schedule.recipient_id,
          vendor_id: schedule.inventory_id,
          face_value: undefined,
          scheduled_date: schedule.scheduled_date,
          delivery_status: schedule.delivery_status,
          sent_at: schedule.sent_at,
          custom_message: schedule.custom_message,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }

  async update(
    id: string,
    updateDto: UpdateGiftSchedulingDto,
    user_id: string,
  ) {
    try {
      const schedule = await this.prisma.giftScheduling.findFirst({
        where: { id, user_id },
      });

      if (!schedule) {
        return {
          success: false,
          message: 'Scheduled gift not found',
        };
      }

      // Only allow updating scalar fields
      const allowedFields = [
        'scheduled_date',
        'custom_message',
        'delivery_status',
      ];
      const data: any = {};
      for (const key of allowedFields) {
        if (key in updateDto) data[key] = (updateDto as any)[key];
      }

      const updated = await this.prisma.giftScheduling.update({
        where: { id },
        data,
      });

      return {
        success: true,
        message: 'Gift schedule updated successfully',
        data: updated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }

  async remove(id: string, user_id: string) {
    try {
      const schedule = await this.prisma.giftScheduling.findFirst({
        where: { id, user_id },
      });

      if (!schedule) {
        return {
          success: false,
          message: 'Scheduled gift not found',
        };
      }

      // Release the card back to available
      await this.prisma.giftCardInventory.update({
        where: { id: schedule.inventory_id },
        data: { status: 'AVAILABLE' },
      });

      // Delete the schedule
      await this.prisma.giftScheduling.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Gift schedule cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }
}
