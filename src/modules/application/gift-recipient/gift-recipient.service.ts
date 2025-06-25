import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGiftRecipientDto } from './dto/create-gift-recipient.dto';
import { UpdateGiftRecipientDto } from './dto/update-gift-recipient.dto';
import { FilterGiftRecipientDto } from './dto/filter-gift-recipient.dto';

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
      const { search, offset = 0, limit = 20 } = filter;

      const where: any = { user_id: user_id };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.giftRecipient.findMany({
          where,
          skip: offset,
          take: limit,
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
        }),
        this.prisma.giftRecipient.count({ where }),
      ]);

      return {
        success: true,
        data: data,
        total: total,
        offset: offset,
        limit: limit,
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
}
