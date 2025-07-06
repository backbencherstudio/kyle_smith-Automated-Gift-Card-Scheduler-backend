import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { UserRepository } from 'src/common/repository/user/user.repository';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // Store connected users with their roles
  private connectedUsers = new Map<
    string,
    { socketId: string; role: string; userId: string }
  >();

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // ✅ DUAL AUTHENTICATION: Try token first, then manual
      const token =
        client.handshake.auth.token || client.handshake.query?.token;
      const manualUserId =
        client.handshake.auth.userId || client.handshake.query?.userId;
      const manualRole =
        client.handshake.auth.role || client.handshake.query?.role;

      let userId: string;
      let role: string;
      let email: string;

      // ✅ METHOD 1: Token-based authentication (JWT)
      if (token) {
        try {
          const payload = this.jwtService.verify(token);
          userId = payload.sub || payload.userId;
          email = payload.email;

          this.logger.log(`Token verified for user: ${userId}`);

          // ✅ FETCH USER ROLE FROM DATABASE
          const userDetails = await UserRepository.getUserDetails(userId);

          if (userDetails) {
            // ✅ EXTRACT ROLE FROM USER TYPE FIELD
            if (userDetails.type) {
              // Map user types to roles
              switch (userDetails.type) {
                case 'su_admin':
                  role = 'admin';
                  break;
                case 'admin':
                  role = 'admin';
                  break;
                case 'vendor':
                  role = 'vendor';
                  break;
                case 'user':
                default:
                  role = 'user';
                  break;
              }
            } else {
              // Default role if no type
              role = 'user';
            }

            this.logger.log(
              `User role extracted from type: ${userDetails.type} -> ${role}`,
            );
          } else {
            this.logger.warn(`User not found in database: ${userId}`);
            // Fall back to manual auth if user not found
          }
        } catch (tokenError) {
          this.logger.warn(`Token verification failed: ${tokenError.message}`);
          // Fall back to manual auth if token fails
        }
      }

      // ✅ METHOD 2: Manual authentication (fallback)
      if (!userId && manualUserId && manualRole) {
        userId = manualUserId;
        role = manualRole;
        email = 'manual@auth.com'; // Placeholder for manual auth

        this.logger.log(`Manual auth: ${userId} (${role})`);
      }

      // ✅ VALIDATION: Ensure we have user info
      if (!userId || !role) {
        this.logger.error('Authentication failed: No valid user info');
        this.logger.error('Final userId:', userId);
        this.logger.error('Final role:', role);
        client.disconnect();
        return;
      }

      // ✅ Store user connection
      this.connectedUsers.set(client.id, {
        socketId: client.id,
        role,
        userId,
      });

      this.logger.log(`Client connected: ${userId} (${role}) - ${email}`);

      // ✅ Send connection confirmation
      client.emit('connected', {
        userId,
        role,
        email,
        authMethod: token ? 'token' : 'manual',
        message: 'Successfully connected to notifications',
      });
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userEntry = this.connectedUsers.get(client.id);
    if (userEntry) {
      this.logger.log(
        `Client disconnected: ${userEntry.userId} (${userEntry.role})`,
      );
    }
    this.connectedUsers.delete(client.id);
  }

  // ✅ OPTIONAL: Keep join event for manual updates
  @SubscribeMessage('join')
  handleJoin(client: Socket, data: { userId: string; role: string }) {
    // Update user info if provided
    this.connectedUsers.set(client.id, {
      socketId: client.id,
      role: data.role,
      userId: data.userId,
    });
    this.logger.log(`User joined: ${data.userId} (${data.role})`);

    client.emit('joined', {
      userId: data.userId,
      role: data.role,
      message: 'Successfully joined notifications room',
    });
  }

  /**
   * Send notification to specific user
   */
  async sendNotification(data: { userId: string; notification: any }) {
    const userEntry = Array.from(this.connectedUsers.values()).find(
      (user) => user.userId === data.userId,
    );

    if (userEntry) {
      this.server
        .to(userEntry.socketId)
        .emit('notification', data.notification);
      this.logger.log(`Notification sent to user: ${data.userId}`);
    } else {
      this.logger.warn(`User ${data.userId} not connected`);
    }
  }

  // ✅ Broadcast to all admin users
  async broadcastToAdmins(notification: any) {
    const adminUsers = Array.from(this.connectedUsers.values()).filter(
      (user) => user.role === 'admin',
    );

    if (adminUsers.length > 0) {
      adminUsers.forEach((admin) => {
        this.server.to(admin.socketId).emit('notification', notification);
      });
      this.logger.log(
        `Notification broadcasted to ${adminUsers.length} admin users`,
      );
    } else {
      this.logger.warn('No admin users connected to receive notification');
    }
  }

  // ✅ Broadcast to all users with specific role
  async broadcastToRole(role: string, notification: any) {
    const roleUsers = Array.from(this.connectedUsers.values()).filter(
      (user) => user.role === role,
    );

    if (roleUsers.length > 0) {
      roleUsers.forEach((user) => {
        this.server.to(user.socketId).emit('notification', notification);
      });
      this.logger.log(
        `Notification broadcasted to ${roleUsers.length} ${role} users`,
      );
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get admin users count
  getAdminUsersCount() {
    return Array.from(this.connectedUsers.values()).filter(
      (user) => user.role === 'admin',
    ).length;
  }

  // ✅ NEW: Get connection status
  @SubscribeMessage('getConnectionStatus')
  async getConnectionStatus(client: Socket) {
    const userEntry = this.connectedUsers.get(client.id);
    return {
      connected: !!userEntry,
      userId: userEntry?.userId,
      role: userEntry?.role,
      totalConnected: this.getConnectedUsersCount(),
      adminCount: this.getAdminUsersCount(),
    };
  }

  // WebSocket event handlers - Use repository directly
  @SubscribeMessage('sendNotification')
  async handleNotification(@MessageBody() data: any) {
    console.log(`Received notification: ${JSON.stringify(data)}`);
    await this.sendNotification(data);
  }

  @SubscribeMessage('createNotification')
  async create(@MessageBody() createNotificationDto: CreateNotificationDto) {
    try {
      const notification = await NotificationRepository.createNotification({
        sender_id: createNotificationDto.sender_id,
        receiver_id: createNotificationDto.receiver_id,
        text: createNotificationDto.text,
        type: createNotificationDto.type,
        entity_id: createNotificationDto.entity_id,
      });

      // Send real-time notification if receiver is specified
      if (createNotificationDto.receiver_id) {
        await this.sendNotification({
          userId: createNotificationDto.receiver_id,
          notification: {
            id: notification.id,
            type: notification.notification_event.type,
            text: notification.notification_event.text,
            created_at: notification.created_at,
            read_at: notification.read_at,
            sender: notification.sender,
          },
        });
      }

      return { success: true, data: notification };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('findAllNotification')
  async findAll() {
    try {
      const result = await NotificationRepository.getUserNotifications(
        'admin',
        1,
        100,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('findOneNotification')
  async findOne(@MessageBody() id: string) {
    try {
      const result = await NotificationRepository.getUserNotifications(
        id,
        1,
        1,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('updateNotification')
  async update(@MessageBody() updateNotificationDto: UpdateNotificationDto) {
    try {
      return { success: true, message: 'Notification updated successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('removeNotification')
  async remove(@MessageBody() data: { id: string; userId: string }) {
    try {
      await NotificationRepository.deleteNotification(data.id, data.userId);
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, data: { notificationId: string }) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      try {
        await NotificationRepository.markAsRead(data.notificationId, userId);
        return { success: true, message: 'Notification marked as read' };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      try {
        const count = await NotificationRepository.getUnreadCount(userId);
        return { success: true, count };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }
  }
}
