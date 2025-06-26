import { Injectable } from '@nestjs/common';
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
import dayjs from 'dayjs';

@Injectable()
export class GiftSchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly giftSchedulingMailService: GiftSchedulingMailService,
    private readonly birthdayCalculator: BirthdayCalculatorService,
  ) {}

  async create(createDto: CreateGiftSchedulingDto, user_id: string) {
    try {
      // 1. Validate recipient's birthday format
      const birthdayStr = createDto.recipient.birthday;
      console.log(birthdayStr);
      const birthday = dayjs(birthdayStr, 'YYYY-MM-DD', true); // strict parsing

      if (!birthday.isValid()) {
        return {
          success: false,
          message: 'Invalid birthday format. Please use YYYY-MM-DD.',
        };
      }

      // 2. Find or create recipient (check by email for the same user)
      let recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          email: createDto.recipient.email,
        },
      });

      if (!recipient) {
        // Create new recipient only if not found
        recipient = await this.prisma.giftRecipient.create({
          data: {
            user: { connect: { id: user_id } },
            name: createDto.recipient.name,
            email: createDto.recipient.email,
            birthday_date: birthday.toDate(), // <-- use parsed date
          },
        });
      } else {
        // Optional: Update recipient name or birthday if changed
        const updateData: any = {};
        if (recipient.name !== createDto.recipient.name) {
          updateData.name = createDto.recipient.name;
        }
        // Update birthday if changed
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

      // 1. Get recipient's birthday
      const recipientBirthday = recipient.birthday_date;
      if (!recipientBirthday) {
        return {
          success: false,
          message: 'Recipient does not have a valid birthday.',
        };
      }

      // 2. Calculate delay until next birthday
      const delay =
        this.birthdayCalculator.getDelayUntilNextBirthday(recipientBirthday);

      // // 2. Find available inventory
      // const card = await this.prisma.giftCardInventory.findFirst({
      //   where: {
      //     vendor_id: createDto.vendor_id,
      //     face_value: createDto.amount,
      //     status: 'AVAILABLE',
      //   },
      //   include: { vendor: true },
      // });
      // if (!card) {
      //   return {
      //     success: false,
      //     message: 'No available gift card for this vendor and amount',
      //   };
      // }

      // // 3. Find or create the Gift record for this inventory
      // let gift = await this.prisma.gift.findFirst({
      //   where: { inventory_id: card.id },
      // });

      // if (!gift) {
      //   try {
      //     gift = await this.prisma.gift.create({
      //       data: { inventory: { connect: { id: card.id } } },
      //     });
      //   } catch (giftError) {
      //     return {
      //       success: false,
      //       message: `Failed to create gift record: ${giftError.message}`,
      //       trace: giftError.stack,
      //     };
      //   }
      // }

      // // 4. Create schedule (include delivery_email)
      // const schedule = await this.prisma.giftScheduling.create({
      //   data: {
      //     user: { connect: { id: user_id } },
      //     recipient: { connect: { id: recipient.id } },
      //     gift: { connect: { id: gift.id } },
      //     inventory: { connect: { id: card.id } },
      //     scheduled_date: new Date(createDto.scheduled_date),
      //     custom_message: createDto.custom_message,
      //     delivery_status: 'PENDING',
      //     delivery_email: recipient.email,
      //   },
      // });

      // // 5. Reserve the card
      // await this.prisma.giftCardInventory.update({
      //   where: { id: card.id },
      //   data: { status: 'RESERVED' },
      // });

      // // Fetch sender (user) info
      // const sender = await this.prisma.user.findUnique({
      //   where: { id: user_id },
      // });

      // // Decrypt the card code
      // const decryptedCode = EncryptionHelper.decrypt(card.card_code);

      const testData = {
        to: 'sadmansakib930@gmail.com',
        recipient_name: 'Test User',
        sender_name: 'Test Sender',
        sender_email: 'sender@example.com',
        vendor_name: 'Test Vendor',
        face_value: 50,
        scheduled_date: new Date(),
        custom_message: 'Test message',
        gift_card_code: 'TEST-1234-5678-9012',
        delay: 60000, // 5 seconds for testing
      };
      const delayInfo = this.birthdayCalculator.getDelayInfo(recipientBirthday);
      console.log(delayInfo.dhmsFormat);
      console.log(delay);

      // Call the dedicated mail service
      // await this.giftSchedulingMailService.sendGiftEmail({
      //   to: recipient.email,
      //   recipient_name: recipient.name,
      //   sender_name: sender?.name || sender?.email || 'Someone',
      //   sender_email: sender?.email || '',
      //   vendor_name: card.vendor.name,
      //   face_value: Number(card.face_value),
      //   scheduled_date: schedule.scheduled_date,
      //   custom_message: schedule.custom_message,
      //   gift_card_code: decryptedCode,
      //   delay,
      // });
      await this.giftSchedulingMailService.sendGiftEmail(testData);

      return {
        success: true,
        message: 'Gift scheduled successfully',
        // data: {
        //   id: schedule.id,
        //   recipient_id: recipient.id,
        //   recipient_name: recipient.name,
        //   recipient_email: recipient.email,
        //   vendor_id: card.vendor_id,
        //   face_value: card.face_value,
        //   scheduled_date: schedule.scheduled_date,
        //   delivery_status: schedule.delivery_status,
        //   is_new_recipient:
        //     !recipient.created_at ||
        //     new Date().getTime() - new Date(recipient.created_at).getTime() <
        //       5000, // Rough check if just created
        // },
      };
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
