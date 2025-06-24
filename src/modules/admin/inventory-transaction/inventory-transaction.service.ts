import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { FilterInventoryTransactionDto } from './dto/filter-inventory-transaction.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InventoryTransactionService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateInventoryTransactionDto) {
    try {
      // Optionally: Validate inventory_id exists
      const inventory = await this.prisma.giftCardInventory.findUnique({
        where: { id: createDto.inventory_id },
      });
      if (!inventory) {
        return { success: false, message: 'Gift card inventory not found' };
      }

      const transaction = await this.prisma.inventoryTransaction.create({
        data: createDto,
      });
      return { success: true, data: transaction };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findAll(filter: FilterInventoryTransactionDto) {
    try {
      const {
        transaction_type,
        inventory_id,
        user_id,
        offset = 0,
        limit = 20,
        search,
      } = filter;

      const where: any = {};
      if (transaction_type) where.transaction_type = transaction_type;
      if (inventory_id) where.inventory_id = inventory_id;
      if (user_id) where.user_id = user_id;
      if (search) {
        where.OR = [{ notes: { contains: search, mode: 'insensitive' } }];
      }

      const [data, total] = await Promise.all([
        this.prisma.inventoryTransaction.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.inventoryTransaction.count({ where }),
      ]);

      return { success: true, data, total, offset, limit };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async findOne(id: string) {
    try {
      const transaction = await this.prisma.inventoryTransaction.findUnique({
        where: { id },
      });
      if (!transaction)
        return { success: false, message: 'Transaction not found' };
      return { success: true, data: transaction };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async getReports(filter: FilterInventoryTransactionDto) {
    try {
      // Example: Group by transaction_type and sum total_amount
      const result = await this.prisma.inventoryTransaction.groupBy({
        by: ['transaction_type'],
        _sum: { total_amount: true, quantity: true },
        _count: { _all: true },
        where: {
          ...(filter.inventory_id && { inventory_id: filter.inventory_id }),
          ...(filter.user_id && { user_id: filter.user_id }),
        },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }

  async getAnalytics(filter: FilterInventoryTransactionDto) {
    try {
      // Example: Calculate profit/loss, total sales, total purchases
      const purchases = await this.prisma.inventoryTransaction.aggregate({
        where: { transaction_type: 'PURCHASE' },
        _sum: { total_amount: true, quantity: true },
      });
      const sales = await this.prisma.inventoryTransaction.aggregate({
        where: { transaction_type: 'SALE' },
        _sum: { total_amount: true, quantity: true },
      });
      const adjustments = await this.prisma.inventoryTransaction.aggregate({
        where: { transaction_type: 'ADJUSTMENT' },
        _sum: { total_amount: true, quantity: true },
      });

      const salesTotal = sales._sum.total_amount || new Decimal(0);
      const purchasesTotal = purchases._sum.total_amount || new Decimal(0);
      const adjustmentsTotal = adjustments._sum.total_amount || new Decimal(0);
      const profit = salesTotal.minus(purchasesTotal);

      return {
        success: true,
        data: {
          total_purchases: purchasesTotal.toString(),
          total_sales: salesTotal.toString(),
          total_adjustments: adjustmentsTotal.toString(),
          profit: profit.toString(),
        },
      };
    } catch (error) {
      return { success: false, message: error.message, trace: error.stack };
    }
  }
}
