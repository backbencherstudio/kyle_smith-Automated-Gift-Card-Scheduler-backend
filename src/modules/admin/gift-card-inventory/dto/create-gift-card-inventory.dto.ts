import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum GiftCardStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  RESERVED = 'RESERVED',
}

export class CreateGiftCardInventoryDto {
  @ApiProperty()
  @IsString()
  vendor_id: string;

  @ApiProperty()
  @IsString()
  card_code: string;

  @ApiProperty()
  @IsNumber()
  face_value: number;

  @ApiProperty()
  @IsNumber()
  purchase_cost: number;

  @ApiProperty()
  @IsNumber()
  selling_price: number;

  @ApiProperty({ enum: GiftCardStatus })
  @IsEnum(GiftCardStatus)
  status: GiftCardStatus;

  @ApiProperty()
  @IsDateString()
  purchase_date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  card_code_hash?: string;
}
