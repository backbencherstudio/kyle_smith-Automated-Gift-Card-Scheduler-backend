import { ApiProperty } from '@nestjs/swagger';

export class GiftRecipient {
  @ApiProperty() id: string;
  @ApiProperty() user_id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty() phone_number?: string;
  @ApiProperty() birthday_date: string;
  @ApiProperty() address?: string;
  @ApiProperty() created_at: string;
  @ApiProperty() updated_at: string;
}
