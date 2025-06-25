import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';

@Module({
  imports: [NotificationModule, ContactModule, FaqModule, GiftCardsModule],
})
export class ApplicationModule {}
