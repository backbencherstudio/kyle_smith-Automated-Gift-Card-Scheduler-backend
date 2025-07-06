import { Global, Module, OnModuleInit } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationController } from './notification.controller';
import { NotificationEvents } from 'src/common/events/notification.events';
import appConfig from 'src/config/app.config';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: appConfig().jwt.secret,
      signOptions: { expiresIn: appConfig().jwt.expiry },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService, NotificationEvents],
  exports: [NotificationGateway, NotificationService, NotificationEvents],
})
export class NotificationModule implements OnModuleInit {
  constructor(
    private notificationGateway: NotificationGateway,
    private notificationEvents: NotificationEvents,
  ) {}

  onModuleInit() {
    // Connect gateway to events for real-time notifications
    this.notificationEvents.setGateway(this.notificationGateway);
  }
}
