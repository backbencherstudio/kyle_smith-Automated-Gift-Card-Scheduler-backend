import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum GiftLogStatus {
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ACTIVE = 'ACTIVE',
  WAITING = 'WAITING',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED',
}

export class GiftLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(GiftLogStatus)
  status?: GiftLogStatus;

  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO string

  @IsOptional()
  @IsString()
  dateTo?: string; // ISO string
}
