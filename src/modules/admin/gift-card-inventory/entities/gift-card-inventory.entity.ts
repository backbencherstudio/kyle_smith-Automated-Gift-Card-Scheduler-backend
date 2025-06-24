import { ApiProperty } from '@nestjs/swagger';

export class GiftCardInventory {
  @ApiProperty() id: string;
  @ApiProperty() vendor_id: string;
  @ApiProperty() card_code: string;
  @ApiProperty() face_value: number;
  @ApiProperty() purchase_cost: number;
  @ApiProperty() selling_price: number;
  @ApiProperty() status: string;
  @ApiProperty() purchase_date: string;
  @ApiProperty({ required: false }) expiry_date?: string;
  @ApiProperty() created_at: string;
  @ApiProperty() updated_at: string;
}
