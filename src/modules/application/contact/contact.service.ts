import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto) {
    try {
      // Validate required fields
      if (
        !createContactDto.first_name ||
        !createContactDto.last_name ||
        !createContactDto.email ||
        !createContactDto.message
      ) {
        return {
          success: false,
          message:
            'first_name, last_name, email, and message are required fields',
        };
      }

      const data = {
        first_name: createContactDto.first_name,
        last_name: createContactDto.last_name,
        email: createContactDto.email,
        message: createContactDto.message,
        phone_number: createContactDto.phone_number || null,
      };

      await this.prisma.contact.create({
        data: data,
      });

      return {
        success: true,
        message: 'Submitted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
