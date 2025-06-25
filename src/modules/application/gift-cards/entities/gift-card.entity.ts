import { ApiProperty } from '@nestjs/swagger';

export class GiftCard {
  @ApiProperty() id: string;
  @ApiProperty() vendor_id: string;
  @ApiProperty() vendor_name: string;
  @ApiProperty() face_value: number;
  @ApiProperty() selling_price: number;
  @ApiProperty() status: string;
  @ApiProperty() purchase_date: string;
  @ApiProperty() expiry_date?: string;
}
