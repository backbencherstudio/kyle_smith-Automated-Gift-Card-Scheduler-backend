import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { ContactModule } from './contact/contact.module';
import { WebsiteInfoModule } from './website-info/website-info.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { ExampleModule } from './example/example.module';
import { VendorModule } from './vendor/vendor.module';
import { GiftCardInventoryModule } from './gift-card-inventory/gift-card-inventory.module';
import { InventoryTransactionModule } from './inventory-transaction/inventory-transaction.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { UserManagementModule } from './user-management/user-management.module';
import { GiftLogModule } from './gift-log/gift-log.module';


@Module({
  imports: [
    FaqModule,
    ContactModule,
    WebsiteInfoModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    ExampleModule,
    VendorModule,
    GiftCardInventoryModule,
    InventoryTransactionModule,
    AdminDashboardModule,
    UserManagementModule,
    GiftLogModule,
  ],
  controllers: [],
})
export class AdminModule {}
