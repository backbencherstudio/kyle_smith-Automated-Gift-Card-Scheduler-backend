import { IsOptional, IsString, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGiftSchedulingDto {
  @IsOptional()
  @IsString()
  recipient_id?: string;

  @IsOptional()
  @IsString()
  delivery_status?: string;

  @IsOptional()
  @IsDateString()
  scheduled_date_from?: string;

  @IsOptional()
  @IsDateString()
  scheduled_date_to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
