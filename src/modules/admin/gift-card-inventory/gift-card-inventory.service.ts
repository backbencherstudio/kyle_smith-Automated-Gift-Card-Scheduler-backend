import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGiftCardInventoryDto } from './dto/create-gift-card-inventory.dto';
import { UpdateGiftCardInventoryDto } from './dto/update-gift-card-inventory.dto';
import { FilterGiftCardInventoryDto } from './dto/filter-gift-card-inventory.dto';
import * as csv from 'csv-parse/sync';
import { EncryptionHelper } from 'src/common/helper/encryption.helper';
import { Prisma } from '@prisma/client';
import { hashCardCode } from 'src/common/helper/hash.helper';
import { InventoryTransactionType } from '../inventory-transaction/dto/create-inventory-transaction.dto';

@Injectable()
export class GiftCardInventoryService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateGiftCardInventoryDto, adminUserId: string) {
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

      // Automatically create a PURCHASE transaction
      await this.prisma.inventoryTransaction.create({
        data: {
          inventory_id: card.id,
          transaction_type: InventoryTransactionType.PURCHASE,
          quantity: 1,
          unit_price: createDto.purchase_cost,
          total_amount: createDto.purchase_cost,
          user_id: adminUserId, // Pass the admin's user ID to this method
          notes: 'Initial stock purchase',
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

  async bulkUpload(file: Express.Multer.File, adminUserId: string) {
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

          await this.prisma.inventoryTransaction.create({
            data: {
              inventory_id: card.id,
              transaction_type: InventoryTransactionType.PURCHASE,
              quantity: 1,
              unit_price: record.purchase_cost,
              total_amount: record.purchase_cost,
              user_id: adminUserId, // Pass this in from controller
              notes: 'Bulk stock purchase',
            },
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

  async findAll(
    filter: FilterGiftCardInventoryDto,
    page?: number,
    limit?: number,
  ) {
    try {
      const { vendor_id, status, min_price, max_price, search } = filter;

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

      // Set default pagination values
      const currentPage = page || 1;
      const currentLimit = limit || 10;

      // Get total count
      const total = await this.prisma.giftCardInventory.count({ where });

      // Calculate skip
      const skip = (currentPage - 1) * currentLimit;

      // Get gift cards with pagination
      const data = await this.prisma.giftCardInventory.findMany({
        where,
        skip: skip,
        take: currentLimit,
        orderBy: { created_at: 'desc' },
        include: { vendor: true },
      });

      // DECRYPT card codes for admin viewing
      const decryptedData = data.map((card) => ({
        ...card,
        card_code: EncryptionHelper.decrypt(card.card_code),
        vendor_name: card.vendor?.name,
      }));

      return {
        success: true,
        data: decryptedData,
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(total / currentLimit),
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findOne(id: string) {
    try {
      const card = await this.prisma.giftCardInventory.findUnique({
        where: { id },
        include: { vendor: true },
      });

      if (!card) return { success: false, message: 'Gift card not found' };

      // DECRYPT card code for admin viewing
      const decryptedCard = {
        ...card,
        card_code: EncryptionHelper.decrypt(card.card_code),
        vendor_name: card.vendor?.name,
      };

      return { success: true, data: decryptedCard };
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
