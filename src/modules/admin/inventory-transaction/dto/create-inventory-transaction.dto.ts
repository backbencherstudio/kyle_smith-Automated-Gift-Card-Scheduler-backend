import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNumber, IsOptional } from 'class-validator';

export enum InventoryTransactionType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreateInventoryTransactionDto {
  @ApiProperty({ enum: InventoryTransactionType })
  @IsEnum(InventoryTransactionType)
  transaction_type: InventoryTransactionType;

  @ApiProperty() @IsString() inventory_id: string;
  @ApiProperty() @IsNumber() quantity: number;
  @ApiProperty() @IsNumber() unit_price: number;
  @ApiProperty() @IsNumber() total_amount: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() user_id?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}
