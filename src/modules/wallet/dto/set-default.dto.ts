import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SetDefaultDto {
  @ApiProperty({
    description: 'Card ID to set as default',
    example: 'card_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  cardId: string;
}
