import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get user notifications' })
  @Get()
  async getUserNotifications(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    try {
      const userId = req.user.userId;
      return await this.notificationService.getUserNotifications(
        userId,
        page,
        limit,
      );
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      return await this.notificationService.getUnreadCount(userId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @ApiOperation({ summary: 'Mark notification as read' })
  @Post(':id/read')
  async markAsRead(@Req() req: Request, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      return await this.notificationService.markAsRead(id, userId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @ApiOperation({ summary: 'Delete notification' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      return await this.notificationService.remove(id, userId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @ApiOperation({ summary: 'Delete all notifications' })
  @Delete()
  async removeAll(@Req() req: Request) {
    try {
      const userId = req.user.userId;
      return await this.notificationService.removeAll(userId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
