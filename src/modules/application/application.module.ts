import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { GiftRecipientModule } from './gift-recipient/gift-recipient.module';
import { GiftSchedulingModule } from './gift-scheduling/gift-scheduling.module';
import { OrderHistoryModule } from './order-history/order-history.module';

@Module({
  imports: [NotificationModule, ContactModule, FaqModule, GiftCardsModule, GiftRecipientModule, GiftSchedulingModule, OrderHistoryModule],
})
export class ApplicationModule {}
