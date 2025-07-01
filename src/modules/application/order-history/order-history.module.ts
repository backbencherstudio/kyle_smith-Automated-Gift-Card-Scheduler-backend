import { Module } from '@nestjs/common';
import { OrderHistoryService } from './order-history.service';
import { OrderHistoryController } from './order-history.controller';

@Module({
  providers: [OrderHistoryService],
  controllers: [OrderHistoryController]
})
export class OrderHistoryModule {}
