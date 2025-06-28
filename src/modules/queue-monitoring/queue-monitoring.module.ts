import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueMonitoringController } from './queue-monitoring.controller';
import { QueueMonitoringService } from './queue-monitoring.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'gift-scheduling-mail-queue',
    }),
  ],
  controllers: [QueueMonitoringController],
  providers: [QueueMonitoringService, PrismaService],
  exports: [QueueMonitoringService],
})
export class QueueMonitoringModule {}
