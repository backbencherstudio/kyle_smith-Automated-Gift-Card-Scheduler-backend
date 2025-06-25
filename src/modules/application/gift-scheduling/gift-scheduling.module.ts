import { Module } from '@nestjs/common';
import { GiftSchedulingController } from './gift-scheduling.controller';
import { GiftSchedulingService } from './gift-scheduling.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';
import { GiftSchedulingMailService } from './mail/gift-scheduling-mail.service';
import { GiftSchedulingMailProcessor } from './mail/gift-scheduling-mail.processor';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'gift-scheduling-mail-queue',
    }),
    MailerModule, // for MailerService injection
  ],
  controllers: [GiftSchedulingController],
  providers: [
    GiftSchedulingService,
    GiftSchedulingMailService,
    GiftSchedulingMailProcessor,
    PrismaService,
  ],
})
export class GiftSchedulingModule {}
