import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum NotificationType {
  // Admin Events
  USER_SIGNUP = 'user_signup',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  GIFT_DELIVERED = 'gift_delivered',
  GIFT_DELIVERY_FAILED = 'gift_delivery_failed',
  INVENTORY_LOW = 'inventory_low',
  QUEUE_HEALTH = 'queue_health',

  // User Events
  ACCOUNT_VERIFIED = 'account_verified',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED_USER = 'payment_failed_user',
  GIFT_SCHEDULED = 'gift_scheduled',
  GIFT_DELIVERED_USER = 'gift_delivered_user',
  GIFT_DELIVERY_FAILED_USER = 'gift_delivery_failed_user',
  BIRTHDAY_REMINDER = 'birthday_reminder',
  GIFT_REMINDER = 'gift_reminder',
}

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sender_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiver_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entity_id?: string;
}
