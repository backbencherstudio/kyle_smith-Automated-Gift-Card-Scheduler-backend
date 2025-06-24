import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { InventoryTransactionType } from './create-inventory-transaction.dto';
import { Type } from 'class-transformer';

export class FilterInventoryTransactionDto {
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  transaction_type?: InventoryTransactionType;
  @IsOptional() @IsString() inventory_id?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @Type(() => Number) @IsNumber() offset?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
  @IsOptional() @IsString() search?: string;
}
