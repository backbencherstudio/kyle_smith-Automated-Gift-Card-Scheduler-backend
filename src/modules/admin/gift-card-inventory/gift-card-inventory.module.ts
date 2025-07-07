import { Module } from '@nestjs/common';
import { GiftCardInventoryController } from './gift-card-inventory.controller';
import { GiftCardInventoryService } from './gift-card-inventory.service';
import { InventoryMonitorService } from './inventory-monitor.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GiftCardInventoryController],
  providers: [GiftCardInventoryService, InventoryMonitorService, PrismaService],
  exports: [InventoryMonitorService],
})
export class GiftCardInventoryModule {}
