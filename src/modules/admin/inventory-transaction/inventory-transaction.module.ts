import { Module } from '@nestjs/common';
import { InventoryTransactionController } from './inventory-transaction.controller';
import { InventoryTransactionService } from './inventory-transaction.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [InventoryTransactionController],
  providers: [InventoryTransactionService, PrismaService],
})
export class InventoryTransactionModule {}
