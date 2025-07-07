import { Injectable } from '@nestjs/common';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Injectable()
export class NotificationEvents {
  private gateway: any; // Will be injected later

  // Method to inject gateway
  setGateway(gateway: any) {
    this.gateway = gateway;
  }

  // Admin Events
  async onUserSignup(userData: any) {
    const notification = await NotificationRepository.createNotification({
      text: `${userData.name} (${userData.email}) has registered`,
      type: 'user_signup',
      entity_id: userData.id,
    });

    // ✅ BROADCAST TO ALL ADMIN USERS
    if (this.gateway) {
      await this.gateway.broadcastToAdmins({
        id: notification.id,
        type: notification.notification_event.type,
        text: notification.notification_event.text,
        created_at: notification.created_at,
        read_at: notification.read_at,
      });
    }
  }

  async onPaymentSuccess(paymentData: any) {
    // Notify admin
    const adminNotification = await NotificationRepository.createNotification({
      text: `Payment of $${paymentData.amount} received from ${paymentData.user_name}`,
      type: 'payment_success',
      entity_id: paymentData.transaction_id,
    });
    console.log(paymentData);

    // Notify user
    const userNotification = await NotificationRepository.createNotification({
      text: `Your payment of $${paymentData.amount} has been confirmed`,
      type: 'payment_confirmed',
      receiver_id: paymentData.user_id,
      entity_id: paymentData.transaction_id,
    });

    // ✅ SEND REAL-TIME NOTIFICATIONS
    if (this.gateway) {
      // Broadcast to all admins
      await this.gateway.broadcastToAdmins({
        id: adminNotification.id,
        type: adminNotification.notification_event.type,
        text: adminNotification.notification_event.text,
        created_at: adminNotification.created_at,
        read_at: adminNotification.read_at,
      });

      // Send to specific user
      await this.gateway.sendNotification({
        userId: paymentData.user_id,
        notification: {
          id: userNotification.id,
          type: userNotification.notification_event.type,
          text: userNotification.notification_event.text,
          created_at: userNotification.created_at,
          read_at: userNotification.read_at,
        },
      });
    }
  }

  async onPaymentFailed(paymentData: any) {
    // Notify admin
    const adminNotification = await NotificationRepository.createNotification({
      text: `Payment of $${paymentData.amount} failed for ${paymentData.user_name}`,
      type: 'payment_failed',
      entity_id: paymentData.transaction_id,
    });

    // Notify user
    const userNotification = await NotificationRepository.createNotification({
      text: `Your payment of $${paymentData.amount} failed. Please try again.`,
      type: 'payment_failed_user',
      receiver_id: paymentData.user_id,
      entity_id: paymentData.transaction_id,
    });

    // ✅ SEND REAL-TIME NOTIFICATIONS
    if (this.gateway) {
      // Broadcast to all admins
      await this.gateway.broadcastToAdmins({
        id: adminNotification.id,
        type: adminNotification.notification_event.type,
        text: adminNotification.notification_event.text,
        created_at: adminNotification.created_at,
        read_at: adminNotification.read_at,
      });

      // Send to specific user
      await this.gateway.sendNotification({
        userId: paymentData.user_id,
        notification: {
          id: userNotification.id,
          type: userNotification.notification_event.type,
          text: userNotification.notification_event.text,
          created_at: userNotification.created_at,
          read_at: userNotification.read_at,
        },
      });
    }
  }

  async onGiftDelivered(giftData: any) {
    // Notify admin
    const adminNotification = await NotificationRepository.createNotification({
      text: `${giftData.vendor_name} gift card delivered to ${giftData.recipient_email}`,
      type: 'gift_delivered',
      entity_id: giftData.gift_scheduling_id,
    });

    // Notify user
    const userNotification = await NotificationRepository.createNotification({
      text: `Your gift card has been delivered to ${giftData.recipient_email}`,
      type: 'gift_delivered_user',
      receiver_id: giftData.user_id,
      entity_id: giftData.gift_scheduling_id,
    });

    // ✅ SEND REAL-TIME NOTIFICATIONS
    if (this.gateway) {
      // Broadcast to all admins
      await this.gateway.broadcastToAdmins({
        id: adminNotification.id,
        type: adminNotification.notification_event.type,
        text: adminNotification.notification_event.text,
        created_at: adminNotification.created_at,
        read_at: adminNotification.read_at,
      });

      // Send to specific user
      await this.gateway.sendNotification({
        userId: giftData.user_id,
        notification: {
          id: userNotification.id,
          type: userNotification.notification_event.type,
          text: userNotification.notification_event.text,
          created_at: userNotification.created_at,
          read_at: userNotification.read_at,
        },
      });
    }
  }

  async onGiftDeliveryFailed(giftData: any) {
    // Notify admin
    const adminNotification = await NotificationRepository.createNotification({
      text: `Failed to deliver ${giftData.vendor_name} gift card to ${giftData.recipient_email}`,
      type: 'gift_delivery_failed',
      entity_id: giftData.gift_scheduling_id,
    });

    // Notify user
    const userNotification = await NotificationRepository.createNotification({
      text: `Failed to deliver your gift card. Please check the email address.`,
      type: 'gift_delivery_failed_user',
      receiver_id: giftData.user_id,
      entity_id: giftData.gift_scheduling_id,
    });

    // ✅ SEND REAL-TIME NOTIFICATIONS
    if (this.gateway) {
      // Broadcast to all admins
      await this.gateway.broadcastToAdmins({
        id: adminNotification.id,
        type: adminNotification.notification_event.type,
        text: adminNotification.notification_event.text,
        created_at: adminNotification.created_at,
        read_at: adminNotification.read_at,
      });

      // Send to specific user
      await this.gateway.sendNotification({
        userId: giftData.user_id,
        notification: {
          id: userNotification.id,
          type: userNotification.notification_event.type,
          text: userNotification.notification_event.text,
          created_at: userNotification.created_at,
          read_at: userNotification.read_at,
        },
      });
    }
  }

  // User Events
  async onAccountVerified(userData: any) {
    const notification = await NotificationRepository.createNotification({
      text: `Your account has been verified successfully`,
      type: 'account_verified',
      receiver_id: userData.id,
      entity_id: userData.id,
    });

    // ✅ SEND TO SPECIFIC USER
    if (this.gateway) {
      await this.gateway.sendNotification({
        userId: userData.id,
        notification: {
          id: notification.id,
          type: notification.notification_event.type,
          text: notification.notification_event.text,
          created_at: notification.created_at,
          read_at: notification.read_at,
        },
      });
    }
  }

  async onGiftScheduled(giftData: any) {
    const notification = await NotificationRepository.createNotification({
      text: `Your gift card has been scheduled for delivery on ${giftData.delivery_date}`,
      type: 'gift_scheduled',
      receiver_id: giftData.user_id,
      entity_id: giftData.gift_scheduling_id,
    });
    console.log(notification);

    // ✅ SEND TO SPECIFIC USER
    if (this.gateway) {
      await this.gateway.sendNotification({
        userId: giftData.user_id,
        notification: {
          id: notification.id,
          type: notification.notification_event.type,
          text: notification.notification_event.text,
          created_at: notification.created_at,
          read_at: notification.read_at,
        },
      });
    }
  }

  async onBirthdayReminder(reminderData: any) {
    const notification = await NotificationRepository.createNotification({
      text: `Don't forget! ${reminderData.recipient_name}'s birthday is tomorrow. Your gift card will be delivered automatically.`,
      type: 'birthday_reminder',
      receiver_id: reminderData.user_id,
      entity_id: reminderData.gift_scheduling_id,
    });

    // ✅ SEND TO SPECIFIC USER
    if (this.gateway) {
      await this.gateway.sendNotification({
        userId: reminderData.user_id,
        notification: {
          id: notification.id,
          type: notification.notification_event.type,
          text: notification.notification_event.text,
          created_at: notification.created_at,
          read_at: notification.read_at,
        },
      });
    }
  }

  async onInventoryLow(inventoryData: any) {
    // Notify admin
    const adminNotification = await NotificationRepository.createNotification({
      text: `${inventoryData.vendor_name} $${inventoryData.face_value} gift cards: Only ${inventoryData.current_stock} remaining (Threshold: ${inventoryData.threshold})`,
      type: inventoryData.notification_type,
      entity_id: inventoryData.vendor_id,
    });

    // ✅ SEND REAL-TIME NOTIFICATION TO ALL ADMINS
    if (this.gateway) {
      await this.gateway.broadcastToAdmins({
        id: adminNotification.id,
        type: adminNotification.notification_event.type,
        text: adminNotification.notification_event.text,
        created_at: adminNotification.created_at,
        read_at: adminNotification.read_at,
      });
    }
  }
}
