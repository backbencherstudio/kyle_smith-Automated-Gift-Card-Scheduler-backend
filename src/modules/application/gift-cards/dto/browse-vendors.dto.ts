import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class BrowseVendorsDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsNumber() min_price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() max_price?: number;
}
