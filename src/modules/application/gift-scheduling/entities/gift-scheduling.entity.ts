import { ApiProperty } from '@nestjs/swagger';

export class GiftScheduling {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty() recipient_id: string;
  @ApiProperty() gift_card_id: string;
  @ApiProperty() inventory_id?: string;
  @ApiProperty() scheduled_date: string;
  @ApiProperty() delivery_email: string;
  @ApiProperty() custom_message?: string;
  @ApiProperty() delivery_status: string;
  @ApiProperty() sent_at?: string;
  @ApiProperty() created_at: string;
  @ApiProperty() updated_at: string;

  // Related data
  @ApiProperty() recipient_name?: string;
  @ApiProperty() vendor_name?: string;
  @ApiProperty() face_value?: number;
  @ApiProperty() selling_price?: number;
}
