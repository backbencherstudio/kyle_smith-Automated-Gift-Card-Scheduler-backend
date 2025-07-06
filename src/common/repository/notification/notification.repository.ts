import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationRepository {
  /**
   * Create a notification
   * @param sender_id - The ID of the user who fired the event
   * @param receiver_id - The ID of the user to notify
   * @param text - The text of the notification
   * @param type - The type of the notification
   * @param entity_id - The ID of the entity related to the notification
   * @returns The created notification
   */
  static async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text?: string;
    type?:
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
    entity_id?: string;
  }) {
    try {
      const notificationEventData = {};
      if (type) {
        notificationEventData['type'] = type;
      }
      if (text) {
        notificationEventData['text'] = text;
      }

      const notificationEvent = await prisma.notificationEvent.create({
        data: {
          type: type,
          text: text,
          ...notificationEventData,
        },
      });

      const notificationData = {};
      if (sender_id) {
        notificationData['sender_id'] = sender_id;
      }
      if (receiver_id) {
        notificationData['receiver_id'] = receiver_id;
      }
      if (entity_id) {
        notificationData['entity_id'] = entity_id;
      }

      const notification = await prisma.notification.create({
        data: {
          notification_event_id: notificationEvent.id,
          ...notificationData,
        },
        include: {
          notification_event: true,
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          receiver: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination
   */
  static async getUserNotifications(userId: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { receiver_id: userId },
          include: {
            notification_event: true,
            sender: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
        }),
        prisma.notification.count({
          where: { receiver_id: userId },
        }),
      ]);

      return { notifications, total, page, limit };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    try {
      return await prisma.notification.updateMany({
        where: { id: notificationId, receiver_id: userId },
        data: { read_at: new Date() },
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for user
   */
  static async getUnreadCount(userId: string) {
    try {
      return await prisma.notification.count({
        where: {
          receiver_id: userId,
          read_at: null,
        },
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      return await prisma.notification.deleteMany({
        where: { id: notificationId, receiver_id: userId },
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Delete all notifications for user
   */
  static async deleteAllNotifications(userId: string) {
    try {
      return await prisma.notification.deleteMany({
        where: { receiver_id: userId },
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }
}
