import { ApiProperty } from '@nestjs/swagger';

export class WalletCard {
  @ApiProperty()
  id: string;

  @ApiProperty()
  payment_method_id: string;

  @ApiProperty()
  is_default: boolean;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
