import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGiftCardInventoryDto } from './dto/create-gift-card-inventory.dto';
import { UpdateGiftCardInventoryDto } from './dto/update-gift-card-inventory.dto';
import { FilterGiftCardInventoryDto } from './dto/filter-gift-card-inventory.dto';
import * as csv from 'csv-parse/sync';
import { EncryptionHelper } from 'src/common/helper/encryption.helper';
import { Prisma } from '@prisma/client';
import { hashCardCode } from 'src/common/helper/hash.helper';

@Injectable()
export class GiftCardInventoryService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateGiftCardInventoryDto) {
    try {
      // Check if vendor exists
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: createDto.vendor_id },
      });
      if (!vendor) {
        return { success: false, message: 'Vendor not found' };
      }

      // Hash the card code
      const cardCodeHash = hashCardCode(createDto.card_code);

      // Check for duplicate
      const existing = await this.prisma.giftCardInventory.findFirst({
        where: {
          vendor_id: createDto.vendor_id,
          card_code_hash: cardCodeHash,
        },
      });
      if (existing) {
        return {
          success: false,
          message: 'Duplicate card code for this vendor',
        };
      }

      // Encrypt the card code before saving
      const encryptedCode = EncryptionHelper.encrypt(createDto.card_code);

      const card = await this.prisma.giftCardInventory.create({
        data: {
          ...createDto,
          card_code: encryptedCode,
          card_code_hash: cardCodeHash,
        },
      });
      return { success: true, data: card };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          // Foreign key constraint failed
          return { success: false, message: 'Invalid vendor_id' };
        }
        if (error.code === 'P2002') {
          // Unique constraint failed
          return {
            success: false,
            message: 'Duplicate card_code for this vendor',
          };
        }
      }
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async bulkUpload(file: Express.Multer.File) {
    try {
      const records = csv.parse(file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
      });
      const created = [];
      for (const record of records) {
        try {
          // Hash and check for duplicate
          const cardCodeHash = hashCardCode(record.card_code);
          const exists = await this.prisma.giftCardInventory.findFirst({
            where: {
              vendor_id: record.vendor_id,
              card_code_hash: cardCodeHash,
            },
          });
          if (exists) continue; // Skip duplicates

          // Encrypt card_code for each record
          record.card_code_hash = cardCodeHash;
          record.card_code = EncryptionHelper.encrypt(record.card_code);

          const card = await this.prisma.giftCardInventory.create({
            data: record,
          });
          created.push(card);
        } catch (err) {
          // Optionally collect failed records for reporting
        }
      }
      return { success: true, data: created, count: created.length };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findAll(filter: FilterGiftCardInventoryDto) {
    try {
      const {
        vendor_id,
        status,
        min_price,
        max_price,
        offset = 0,
        limit = 20,
        search,
      } = filter;

      const where: any = {};
      if (vendor_id) where.vendor_id = vendor_id;
      if (status) where.status = status;
      if (min_price || max_price) {
        where.selling_price = {};
        if (min_price) where.selling_price.gte = min_price;
        if (max_price) where.selling_price.lte = max_price;
      }
      if (search) {
        where.OR = [{ card_code: { contains: search, mode: 'insensitive' } }];
      }

      const [data, total] = await Promise.all([
        this.prisma.giftCardInventory.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.giftCardInventory.count({ where }),
      ]);

      return { success: true, data, total, offset, limit };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findOne(id: string) {
    try {
      const card = await this.prisma.giftCardInventory.findUnique({
        where: { id },
      });
      if (!card) return { success: false, message: 'Gift card not found' };
      return { success: true, data: card };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async update(id: string, updateDto: UpdateGiftCardInventoryDto) {
    try {
      const dataToUpdate = { ...updateDto };
      if (updateDto.card_code) {
        // Hash and check for duplicate (if card_code is being updated)
        const cardCodeHash = hashCardCode(updateDto.card_code);
        const existing = await this.prisma.giftCardInventory.findFirst({
          where: {
            vendor_id: updateDto.vendor_id, // Make sure vendor_id is present in updateDto
            card_code_hash: cardCodeHash,
            NOT: { id }, // Exclude current record
          },
        });
        if (existing) {
          return {
            success: false,
            message: 'Duplicate card code for this vendor',
          };
        }
        dataToUpdate.card_code = EncryptionHelper.encrypt(updateDto.card_code);
        dataToUpdate.card_code_hash = cardCodeHash;
      }
      const card = await this.prisma.giftCardInventory.update({
        where: { id },
        data: dataToUpdate,
      });
      return { success: true, data: card };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.giftCardInventory.delete({ where: { id } });
      return { success: true, message: 'Gift card deleted' };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }
}
