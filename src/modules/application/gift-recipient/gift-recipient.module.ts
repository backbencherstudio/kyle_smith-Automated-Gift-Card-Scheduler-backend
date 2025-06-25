import { Module } from '@nestjs/common';
import { GiftRecipientController } from './gift-recipient.controller';
import { GiftRecipientService } from './gift-recipient.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GiftRecipientController],
  providers: [GiftRecipientService, PrismaService],
})
export class GiftRecipientModule {}
