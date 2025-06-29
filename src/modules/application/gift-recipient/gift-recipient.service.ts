import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGiftRecipientDto } from './dto/create-gift-recipient.dto';
import { UpdateGiftRecipientDto } from './dto/update-gift-recipient.dto';
import { FilterGiftRecipientDto } from './dto/filter-gift-recipient.dto';
import { FilterGiftRecipientWithGiftsDto } from './dto/filter-gift-recipient-with-gifts.dto';

@Injectable()
export class GiftRecipientService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateGiftRecipientDto, user_id: string) {
    try {
      // Check if recipient with same email already exists for this user
      const existing_recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          user_id: user_id,
          email: createDto.email,
        },
      });

      if (existing_recipient) {
        return {
          success: false,
          message: 'A recipient with this email already exists',
        };
      }

      const recipient = await this.prisma.giftRecipient.create({
        data: {
          user_id: user_id,
          name: createDto.name,
          email: createDto.email,
          phone_number: createDto.phone_number,
          birthday_date: new Date(createDto.birthday_date),
          address: createDto.address,
        },
      });

      return {
        success: true,
        message: 'Recipient added successfully',
        data: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          phone_number: recipient.phone_number,
          birthday_date: recipient.birthday_date,
          address: recipient.address,
          created_at: recipient.created_at,
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

  async findAll(filter: FilterGiftRecipientDto, user_id: string) {
    try {
      // ✅ Ensure values are numbers
      const page = parseInt(filter.page?.toString()) || 1;
      const limit = parseInt(filter.limit?.toString()) || 10;
      const search = filter.search;

      const where: any = { user_id: user_id };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.prisma.giftRecipient.count({ where });

      // Get data with pagination
      const data = await this.prisma.giftRecipient.findMany({
        where,
        skip: skip,
        take: limit, // ✅ Now guaranteed to be a number
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          birthday_date: true,
          address: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        data: data,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
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
      const recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          id: id,
          user_id: user_id, // Ensure user can only access their own recipients
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          birthday_date: true,
          address: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!recipient) {
        return {
          success: false,
          message: 'Recipient not found',
        };
      }

      return {
        success: true,
        data: recipient,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }

  async update(id: string, updateDto: UpdateGiftRecipientDto, user_id: string) {
    try {
      // Check if recipient exists and belongs to user
      const existing_recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          id: id,
          user_id: user_id,
        },
      });

      if (!existing_recipient) {
        return {
          success: false,
          message: 'Recipient not found',
        };
      }

      // If email is being updated, check for duplicates
      if (updateDto.email && updateDto.email !== existing_recipient.email) {
        const duplicate_recipient = await this.prisma.giftRecipient.findFirst({
          where: {
            user_id: user_id,
            email: updateDto.email,
            id: { not: id }, // Exclude current recipient
          },
        });

        if (duplicate_recipient) {
          return {
            success: false,
            message: 'A recipient with this email already exists',
          };
        }
      }

      const update_data: any = {};
      if (updateDto.name) update_data.name = updateDto.name;
      if (updateDto.email) update_data.email = updateDto.email;
      if (updateDto.phone_number !== undefined)
        update_data.phone_number = updateDto.phone_number;
      if (updateDto.birthday_date)
        update_data.birthday_date = new Date(updateDto.birthday_date);
      if (updateDto.address !== undefined)
        update_data.address = updateDto.address;

      const recipient = await this.prisma.giftRecipient.update({
        where: { id: id },
        data: update_data,
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          birthday_date: true,
          address: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        message: 'Recipient updated successfully',
        data: recipient,
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
      // Check if recipient exists and belongs to user
      const existing_recipient = await this.prisma.giftRecipient.findFirst({
        where: {
          id: id,
          user_id: user_id,
        },
      });

      if (!existing_recipient) {
        return {
          success: false,
          message: 'Recipient not found',
        };
      }

      // Check if recipient has any scheduled gifts
      const scheduled_gifts = await this.prisma.giftScheduling.count({
        where: {
          recipient_id: id,
        },
      });

      if (scheduled_gifts > 0) {
        return {
          success: false,
          message:
            'Cannot delete recipient with scheduled gifts. Please cancel all scheduled gifts first.',
        };
      }

      await this.prisma.giftRecipient.delete({
        where: { id: id },
      });

      return {
        success: true,
        message: 'Recipient deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        trace: error.stack,
      };
    }
  }

  /**
   * Helper function to format birthday to MM-DD format
   */
  private formatBirthdayMMDD(birthdayDate: Date): string {
    const month = String(birthdayDate.getMonth() + 1).padStart(2, '0');
    const day = String(birthdayDate.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }

  /**
   * Helper function to build birthday filter for month and day
   */
  private buildBirthdayFilter(month?: number, day?: number) {
    if (!month && !day) return {};

    const where: any = {};

    if (month && day) {
      // Filter by specific month and day (any year)
      where.AND = [
        { birthday_date: { gte: new Date(1900, month - 1, day) } },
        { birthday_date: { lt: new Date(1900, month - 1, day + 1) } },
      ];
    } else if (month) {
      // Filter by month only
      where.AND = [
        { birthday_date: { gte: new Date(1900, month - 1, 1) } },
        { birthday_date: { lt: new Date(1900, month, 1) } },
      ];
    }

    return where;
  }

  /**
   * Helper function to get simplified delivery status
   */
  private getDeliveryStatus(giftSchedules: any[]): string {
    if (giftSchedules.length === 0) return 'none';

    const hasPending = giftSchedules.some(
      (g) => g.delivery_status === 'PENDING',
    );
    const hasSent = giftSchedules.some((g) => g.delivery_status === 'SENT');

    if (hasPending) return 'pending';
    if (hasSent) return 'sent';
    return 'none';
  }

  /**
   * Helper function to check if birthday is upcoming (within 30 days)
   */
  private isUpcoming(birthdayDate: Date): boolean {
    const today = new Date();
    const nextBirthday = this.calculateNextBirthday(birthdayDate);
    const daysUntilBirthday = Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilBirthday <= 30 && daysUntilBirthday >= 0;
  }

  /**
   * Helper function to calculate next birthday
   */
  private calculateNextBirthday(birthdayDate: Date): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    const birthday = new Date(birthdayDate);

    // Set this year's birthday
    const thisYearBirthday = new Date(
      currentYear,
      birthday.getMonth(),
      birthday.getDate(),
    );

    // If this year's birthday has passed, calculate next year's
    if (thisYearBirthday < now) {
      return new Date(currentYear + 1, birthday.getMonth(), birthday.getDate());
    }

    return thisYearBirthday;
  }

  /**
   * Get all recipients with simplified gift scheduling information
   */
  async findAllWithGifts(
    filter: FilterGiftRecipientWithGiftsDto,
    user_id: string,
  ) {
    try {
      const page = parseInt(filter.page?.toString()) || 1;
      const limit = parseInt(filter.limit?.toString()) || 10;
      const search = filter.search;
      const month = filter.month;
      const day = filter.day;

      const where: any = { user_id: user_id };

      // Add search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add birthday filtering
      const birthdayFilter = this.buildBirthdayFilter(month, day);
      if (Object.keys(birthdayFilter).length > 0) {
        where.AND = where.AND
          ? [...where.AND, birthdayFilter]
          : [birthdayFilter];
      }

      // Calculate skip
      const skip = (page - 1) * limit;

      // Get total count
      const total = await this.prisma.giftRecipient.count({ where });

      // Get data with pagination and includes
      const recipients = await this.prisma.giftRecipient.findMany({
        where,
        skip: skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          gift_scheduling: {
            include: {
              inventory: {
                include: {
                  vendor: true,
                },
              },
            },
            orderBy: { scheduled_date: 'desc' },
          },
        },
      });

      // ✅ TRANSFORM TO SIMPLIFIED FORMAT
      const simplifiedData = recipients.map((recipient) => ({
        name: recipient.name,
        birthday_display: this.formatBirthdayMMDD(recipient.birthday_date),
        delivery_status: this.getDeliveryStatus(recipient.gift_scheduling),
        isUpcoming: this.isUpcoming(recipient.birthday_date),
      }));

      return {
        success: true,
        data: simplifiedData,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit),
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
