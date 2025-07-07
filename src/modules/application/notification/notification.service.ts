import { Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

// ✅ Define the allowed notification types
type NotificationType =
  | 'message'
  | 'comment'
  | 'review'
  | 'booking'
  | 'payment_transaction'
  | 'package'
  | 'blog'
  | 'user_signup'
  | 'payment_success'
  | 'payment_failed'
  | 'gift_delivered'
  | 'gift_delivery_failed'
  | 'inventory_low'
  | 'queue_health'
  | 'account_verified'
  | 'payment_confirmed'
  | 'payment_failed_user'
  | 'gift_scheduled'
  | 'gift_delivered_user'
  | 'gift_delivery_failed_user'
  | 'birthday_reminder'
  | 'gift_reminder';

@Injectable()
export class NotificationService {
  constructor() {}

  /**
   * Create notification (database only - no real-time)
   */
  async create(createNotificationDto: CreateNotificationDto) {
    try {
      const notification = await NotificationRepository.createNotification({
        sender_id: createNotificationDto.sender_id,
        receiver_id: createNotificationDto.receiver_id,
        text: createNotificationDto.text,
        type: createNotificationDto.type,
        entity_id: createNotificationDto.entity_id,
      });

      return { success: true, data: notification };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    console.log("userId: ", userId)
    console.log("page: ", page)
    console.log("limit: ", limit)
    try {
      // ✅ Ensure page and limit are numbers
      const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
      const limitNumber =
        typeof limit === 'string' ? parseInt(limit, 10) : limit;

      const result = await NotificationRepository.getUserNotifications(
        userId,
        pageNumber,
        limitNumber,
      );

      return {
        success: true,
        ...result,
        // ✅ ADD PAGINATION METADATA
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all notifications (for admin)
   */
  async findAll() {
    try {
      const notifications = await NotificationRepository.getUserNotifications(
        'admin',
        1,
        100,
      );
      return { success: true, data: notifications };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get single notification
   */
  async findOne(id: string) {
    try {
      const notification = await NotificationRepository.getUserNotifications(
        id,
        1,
        1,
      );
      return { success: true, data: notification };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Update notification
   */
  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    try {
      // For now, just return success as notifications are typically read-only
      return { success: true, message: 'Notification updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    try {
      await NotificationRepository.markAsRead(notificationId, userId);
      return { success: true, message: 'Notification marked as read' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string) {
    try {
      const count = await NotificationRepository.getUnreadCount(userId);
      return { success: true, count };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove notification
   */
  async remove(notificationId: string, userId: string) {
    try {
      await NotificationRepository.deleteNotification(notificationId, userId);
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove all notifications for user
   */
  async removeAll(userId: string) {
    try {
      await NotificationRepository.deleteAllNotifications(userId);
      return {
        success: true,
        message: 'All notifications deleted successfully',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ✅ NEW: Get connected users statistics
  async getConnectionStats() {
    // This would need gateway injection or a different approach
    return {
      totalConnected: 0, // Will be implemented when gateway is injected
      adminUsers: 0,
      regularUsers: 0,
    };
  }

  // ✅ FIXED: Send custom notification to all admins
  async sendCustomAdminNotification(text: string, type: NotificationType) {
    const notification = await NotificationRepository.createNotification({
      text,
      type, // ✅ Now uses the correct type
    });

    // This would need gateway injection
    return notification;
  }

  // ✅ FIXED: Send custom notification to specific user
  async sendCustomUserNotification(
    userId: string,
    text: string,
    type: NotificationType,
  ) {
    const notification = await NotificationRepository.createNotification({
      text,
      type, // ✅ Now uses the correct type
      receiver_id: userId,
    });

    // This would need gateway injection
    return notification;
  }

  // ✅ NEW: Send system notification (for admin use)
  async sendSystemNotification(
    text: string,
    type: NotificationType = 'message',
  ) {
    const notification = await NotificationRepository.createNotification({
      text,
      type,
    });

    return notification;
  }

  // ✅ NEW: Send inventory low notification
  async sendInventoryLowNotification(vendorName: string, currentStock: number) {
    const notification = await NotificationRepository.createNotification({
      text: `Low inventory alert: ${vendorName} has only ${currentStock} cards remaining`,
      type: 'inventory_low',
    });

    return notification;
  }

  // ✅ NEW: Send queue health notification
  async sendQueueHealthNotification(message: string) {
    const notification = await NotificationRepository.createNotification({
      text: message,
      type: 'queue_health',
    });

    return notification;
  }

  // ✅ NEW: Send gift reminder notification
  async sendGiftReminderNotification(
    userId: string,
    recipientName: string,
    deliveryDate: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `Reminder: Gift card for ${recipientName} will be delivered on ${deliveryDate}`,
      type: 'gift_reminder',
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send payment transaction notification
  async sendPaymentTransactionNotification(
    userId: string,
    amount: number,
    status: 'success' | 'failed',
  ) {
    const type: NotificationType =
      status === 'success' ? 'payment_confirmed' : 'payment_failed_user';
    const text =
      status === 'success'
        ? `Payment of $${amount} has been confirmed`
        : `Payment of $${amount} failed. Please try again.`;

    const notification = await NotificationRepository.createNotification({
      text,
      type,
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send gift delivery status notification
  async sendGiftDeliveryNotification(
    userId: string,
    vendorName: string,
    recipientEmail: string,
    status: 'delivered' | 'failed',
  ) {
    const type: NotificationType =
      status === 'delivered'
        ? 'gift_delivered_user'
        : 'gift_delivery_failed_user';
    const text =
      status === 'delivered'
        ? `Your ${vendorName} gift card has been delivered to ${recipientEmail}`
        : `Failed to deliver your ${vendorName} gift card to ${recipientEmail}. Please check the email address.`;

    const notification = await NotificationRepository.createNotification({
      text,
      type,
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send account verification notification
  async sendAccountVerificationNotification(userId: string) {
    const notification = await NotificationRepository.createNotification({
      text: 'Your account has been verified successfully',
      type: 'account_verified',
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send gift scheduling notification
  async sendGiftSchedulingNotification(userId: string, deliveryDate: string) {
    const notification = await NotificationRepository.createNotification({
      text: `Your gift card has been scheduled for delivery on ${deliveryDate}`,
      type: 'gift_scheduled',
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send birthday reminder notification
  async sendBirthdayReminderNotification(
    userId: string,
    recipientName: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `Don't forget! ${recipientName}'s birthday is tomorrow. Your gift card will be delivered automatically.`,
      type: 'birthday_reminder',
      receiver_id: userId,
    });

    return notification;
  }

  // ✅ NEW: Send user signup notification (for admin)
  async sendUserSignupNotification(userName: string, userEmail: string) {
    const notification = await NotificationRepository.createNotification({
      text: `${userName} (${userEmail}) has registered`,
      type: 'user_signup',
    });

    return notification;
  }

  // ✅ NEW: Send payment success notification (for admin)
  async sendPaymentSuccessNotification(
    userName: string,
    amount: number,
    transactionId: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `Payment of $${amount} received from ${userName}`,
      type: 'payment_success',
      entity_id: transactionId,
    });

    return notification;
  }

  // ✅ NEW: Send payment failed notification (for admin)
  async sendPaymentFailedNotification(
    userName: string,
    amount: number,
    transactionId: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `Payment of $${amount} failed for ${userName}`,
      type: 'payment_failed',
      entity_id: transactionId,
    });

    return notification;
  }

  // ✅ NEW: Send gift delivered notification (for admin)
  async sendGiftDeliveredAdminNotification(
    vendorName: string,
    recipientEmail: string,
    giftSchedulingId: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `${vendorName} gift card delivered to ${recipientEmail}`,
      type: 'gift_delivered',
      entity_id: giftSchedulingId,
    });

    return notification;
  }

  // ✅ NEW: Send gift delivery failed notification (for admin)
  async sendGiftDeliveryFailedAdminNotification(
    vendorName: string,
    recipientEmail: string,
    giftSchedulingId: string,
  ) {
    const notification = await NotificationRepository.createNotification({
      text: `Failed to deliver ${vendorName} gift card to ${recipientEmail}`,
      type: 'gift_delivery_failed',
      entity_id: giftSchedulingId,
    });

    return notification;
  }
}
