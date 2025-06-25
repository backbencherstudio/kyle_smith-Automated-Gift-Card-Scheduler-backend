import { Module } from '@nestjs/common';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GiftCardsController],
  providers: [GiftCardsService, PrismaService],
})
export class GiftCardsModule {}
