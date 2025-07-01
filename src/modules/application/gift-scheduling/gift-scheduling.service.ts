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
   * Main method that handles payment-first gift scheduling with transaction safety
   */
  async createWithPayment(
    createDto: CreateGiftSchedulingDto,
    user_id: string,
    payment_method_id: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      try {
        // 1. Validate input data
        const validationResult = await this.validateGiftSchedulingData(
          createDto,
          user_id,
          tx,
        );
        if (!validationResult.success) {
          return validationResult;
        }

        const { recipient, card, sendGiftDate, delay } = validationResult.data;

        // 2. Get user's billing information
        const user = await tx.user.findUnique({
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

        // 3. Reserve inventory atomically
        const reservedCard = await this.reserveInventoryAtomically(card.id, tx);
        if (!reservedCard.success) {
          return reservedCard;
        }

        // 4. Process payment with SELLING PRICE
        const paymentResult = await this.processPayment({
          amount: Number(card.selling_price),
          customer_id: user.billing_id,
          payment_method_id: payment_method_id,
          metadata: {
            user_id: user_id,
            vendor_id: createDto.vendor_id,
            recipient_email: createDto.recipient.email,
            gift_type: 'scheduled_gift',
            face_value: Number(card.face_value),
            selling_price: Number(card.selling_price),
            inventory_id: card.id,
          },
        });

        if (!paymentResult.success) {
          // ✅ ENHANCED: Handle payment failure with proper inventory cleanup
          return await this.handlePaymentFailure({
            paymentResult,
            card,
            tx,
          });
        }

        // 5. Create schedule after successful payment
        const scheduleResult = await this.createScheduleAfterPayment({
          createDto,
          user_id,
          recipient,
          card,
          sendGiftDate,
          delay,
          payment_intent_id: paymentResult.data.payment_intent_id,
          tx,
        });

        // ✅ SIMPLIFIED: Return only essential data
        return {
          success: true,
          message: 'Gift scheduled successfully',
          data: {
            schedule_id: scheduleResult.data.schedule_id,
            payment_intent_id: paymentResult.data.payment_intent_id,
            payment_status: paymentResult.data.payment_status,
            face_value: Number(card.face_value),
            selling_price: Number(card.selling_price),
            vendor_name: card.vendor.name,
            recipient_name: recipient.name,
            scheduled_date: sendGiftDate.toDate(),
          },
        };
      } catch (error) {
        return {
          success: false,
          message: error.message,
          details: {
            vendor_id: createDto.vendor_id,
            requested_amount: createDto.amount,
          },
        };
      }
    });
  }

  /**
   * Validate gift scheduling data and find required resources
   */
  private async validateGiftSchedulingData(
    createDto: CreateGiftSchedulingDto,
    user_id: string,
    tx?: any,
  ) {
    const prismaClient = tx || this.prisma;

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
      let recipient = await prismaClient.giftRecipient.findFirst({
        where: {
          email: createDto.recipient.email,
        },
      });

      if (!recipient) {
        recipient = await prismaClient.giftRecipient.create({
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
          recipient = await prismaClient.giftRecipient.update({
            where: { id: recipient.id },
            data: updateData,
          });
        }
      }

      // 4. Calculate delay
      const delay = this.birthdayCalculator.getDelayUntilNextBirthday(
        sendGiftDate.toDate(),
      );

      // ✅ ENHANCED: Find available and non-expired inventory
      const card = await prismaClient.giftCardInventory.findFirst({
        where: {
          vendor_id: createDto.vendor_id,
          face_value: createDto.amount,
          status: 'AVAILABLE',
          // ✅ NEW: Filter out expired cards at query level
          OR: [
            { expiry_date: null }, // Cards with no expiry date
            { expiry_date: { gt: new Date() } }, // Cards not yet expired
          ],
        },
        include: { vendor: true },
        orderBy: [
          { expiry_date: 'asc' }, // Prioritize cards expiring soon (FIFO for expiry)
          { created_at: 'asc' }, // Then by creation date (FIFO for inventory)
        ],
      });

      if (!card) {
        return {
          success: false,
          message: `No available gift card for vendor ${createDto.vendor_id} with face value $${createDto.amount}. All cards may be expired or out of stock.`,
        };
      }

      // ✅ ENHANCED: Validate selling price (no expiry check needed)
      if (Number(card.selling_price) <= 0) {
        return {
          success: false,
          message: 'Invalid selling price for selected gift card',
        };
      }

      // ✅ NEW: Log selected card for debugging
      console.log('Selected card:', {
        id: card.id,
        face_value: card.face_value,
        selling_price: card.selling_price,
        expiry_date: card.expiry_date,
        days_until_expiry: card.expiry_date
          ? dayjs(card.expiry_date).diff(dayjs(), 'day')
          : 'No expiry',
      });

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
   * Reserve inventory atomically to prevent race conditions
   */
  private async reserveInventoryAtomically(cardId: string, tx: any) {
    try {
      const updatedCard = await tx.giftCardInventory.updateMany({
        where: {
          id: cardId,
          status: 'AVAILABLE', // Only update if still available
        },
        data: { status: 'RESERVED' },
      });

      if (updatedCard.count === 0) {
        return {
          success: false,
          message: 'Gift card is no longer available',
        };
      }

      console.log(`Card ${cardId} reserved successfully`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reserve inventory: ${error.message}`,
      };
    }
  }

  /**
   * Release inventory back to available status
   */
  private async releaseInventory(cardId: string, tx: any) {
    try {
      const result = await tx.giftCardInventory.updateMany({
        where: {
          id: cardId,
          status: 'RESERVED', // Only release if currently reserved
        },
        data: { status: 'AVAILABLE' },
      });

      if (result.count > 0) {
        console.log(`Card ${cardId} released back to available`);
      } else {
        console.log(`Card ${cardId} was not in reserved status`);
      }
    } catch (error) {
      console.error('Failed to release inventory:', error);
    }
  }

  /**
   * Mark inventory as sold (after successful payment and gift scheduling)
   */
  private async markInventoryAsSold(cardId: string, tx: any) {
    try {
      const result = await tx.giftCardInventory.updateMany({
        where: {
          id: cardId,
          status: 'RESERVED', // Only mark as sold if currently reserved
        },
        data: { status: 'USED' },
      });

      if (result.count > 0) {
        console.log(`Card ${cardId} marked as sold`);
      }
    } catch (error) {
      console.error('Failed to mark inventory as sold:', error);
    }
  }

  /**
   * Simple payment failure handling with proper inventory management
   */
  private async handlePaymentFailure({
    paymentResult,
    card,
    tx,
  }: {
    paymentResult: any;
    card: any;
    tx: any;
  }) {
    try {
      console.log('Payment failed, releasing inventory:', card.id);

      // 1. ✅ CRITICAL: Release inventory back to available
      await this.releaseInventory(card.id, tx);

      // 2. Update payment transaction status to failed
      if (paymentResult.data?.payment_intent_id) {
        await tx.paymentTransaction.updateMany({
          where: { reference_number: paymentResult.data.payment_intent_id },
          data: {
            status: 'failed',
            raw_status: paymentResult.data.payment_status || 'failed',
          },
        });
      }

      // 3. Create inventory adjustment transaction for audit trail
      await tx.inventoryTransaction.create({
        data: {
          inventory_id: card.id,
          transaction_type: 'ADJUSTMENT',
          quantity: 1,
          unit_price: card.selling_price,
          total_amount: card.selling_price,
          user_id: paymentResult.metadata?.user_id,
          notes: 'Gift card returned to inventory due to payment failure',
        },
      });

      return {
        success: false,
        message: `Payment failed: ${paymentResult.message}`,
      };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      return {
        success: false,
        message: 'Payment failed',
      };
    }
  }

  /**
   * Process payment using Stripe with enhanced status tracking
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

      // ✅ ENHANCED: Check actual payment status
      const paymentStatus = paymentIntent.status;
      const isPaymentConfirmed = ['succeeded', 'processing'].includes(
        paymentStatus,
      );

      // Log payment transaction
      await this.prisma.paymentTransaction.create({
        data: {
          user_id: metadata.user_id,
          reference_number: paymentIntent.id,
          status: paymentStatus,
          raw_status: paymentStatus,
          amount: metadata.face_value,
          currency: 'usd',
          paid_amount: paymentIntent.amount / 100,
          paid_currency: paymentIntent.currency,
          provider: 'stripe',
          type: 'gift_scheduling',
          transaction_category: 'USER_SALE',
          inventory_id: metadata.inventory_id,
        },
      });

      return {
        success: isPaymentConfirmed,
        data: {
          payment_intent_id: paymentIntent.id,
          payment_status: paymentStatus,
          is_confirmed: isPaymentConfirmed,
          requires_action: paymentStatus === 'requires_action',
          requires_payment_method: paymentStatus === 'requires_payment_method',
          paid_amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          client_secret: paymentIntent.client_secret,
        },
        message: isPaymentConfirmed
          ? 'Payment confirmed successfully'
          : `Payment status: ${paymentStatus}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Payment failed: ${error.message}`,
        error_code: error.code,
      };
    }
  }

  /**
   * Create schedule after successful payment with inventory transaction
   */
  private async createScheduleAfterPayment({
    createDto,
    user_id,
    recipient,
    card,
    sendGiftDate,
    delay,
    payment_intent_id,
    tx,
  }: {
    createDto: CreateGiftSchedulingDto;
    user_id: string;
    recipient: any;
    card: any;
    sendGiftDate: any;
    delay: number;
    payment_intent_id: string;
    tx: any;
  }) {
    try {
      // 1. Find or create the Gift record
      let gift = await tx.gift.findFirst({
        where: { inventory_id: card.id },
      });

      if (!gift) {
        gift = await tx.gift.create({
          data: { inventory: { connect: { id: card.id } } },
        });
      }

      // 2. Create schedule
      const schedule = await tx.giftScheduling.create({
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

      // 3. ✅ CRITICAL: Mark inventory as sold (not just reserved)
      await this.markInventoryAsSold(card.id, tx);

      // 4. Create inventory sale transaction
      await tx.inventoryTransaction.create({
        data: {
          inventory_id: card.id,
          transaction_type: 'SALE',
          quantity: 1,
          unit_price: card.selling_price,
          total_amount: card.selling_price,
          user_id: user_id,
          notes: 'Gift card sale via gift scheduling',
        },
      });

      // 5. Update payment transaction with inventory reference
      await tx.paymentTransaction.updateMany({
        where: { reference_number: payment_intent_id },
        data: { inventory_id: card.id },
      });

      // 6. Send email
      const sender = await tx.user.findUnique({
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
          face_value: Number(card.face_value),
          selling_price: Number(card.selling_price),
          vendor_name: card.vendor.name,
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
          include: {
            inventory: {
              include: { vendor: true },
            },
            recipient: true,
          },
        }),
        this.prisma.giftScheduling.count({ where }),
      ]);

      // ✅ ENHANCED: Map to user-friendly output with inventory details
      const result = data.map((schedule) => ({
        id: schedule.id,
        recipient_id: schedule.recipient_id,
        recipient_name: schedule.recipient.name,
        recipient_email: schedule.recipient.email,
        vendor_id: schedule.inventory?.vendor?.id,
        vendor_name: schedule.inventory?.vendor?.name,
        face_value: schedule.inventory?.face_value,
        selling_price: schedule.inventory?.selling_price,
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
        include: {
          inventory: {
            include: { vendor: true },
          },
          recipient: true,
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
          recipient_name: schedule.recipient.name,
          recipient_email: schedule.recipient.email,
          vendor_id: schedule.inventory?.vendor?.id,
          vendor_name: schedule.inventory?.vendor?.name,
          face_value: schedule.inventory?.face_value,
          selling_price: schedule.inventory?.selling_price,
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
    return await this.prisma.$transaction(async (tx) => {
      try {
        const schedule = await tx.giftScheduling.findFirst({
          where: { id, user_id },
          include: {
            inventory: true,
          },
        });

        if (!schedule) {
          return {
            success: false,
            message: 'Scheduled gift not found',
          };
        }

        // ✅ ENHANCED: Create inventory adjustment transaction for cancellation
        await tx.inventoryTransaction.create({
          data: {
            inventory_id: schedule.inventory_id,
            transaction_type: 'ADJUSTMENT',
            quantity: 1,
            unit_price: schedule.inventory.selling_price,
            total_amount: schedule.inventory.selling_price,
            user_id: user_id,
            notes: 'Gift card returned to inventory due to cancellation',
          },
        });

        // Release the card back to available
        await tx.giftCardInventory.update({
          where: { id: schedule.inventory_id },
          data: { status: 'AVAILABLE' },
        });

        // Delete the schedule
        await tx.giftScheduling.delete({
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
    });
  }
}
