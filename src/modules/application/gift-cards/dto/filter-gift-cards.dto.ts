import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGiftCardsDto {
  @IsOptional() @IsString() vendor_id?: string;
  @IsOptional() @Type(() => Number) @IsNumber() min_price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() max_price?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsNumber() offset?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
