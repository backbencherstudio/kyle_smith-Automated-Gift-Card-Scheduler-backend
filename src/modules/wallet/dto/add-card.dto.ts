import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddCardDto {
  @ApiProperty({
    description: 'Stripe payment method ID',
    example: 'pm_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
