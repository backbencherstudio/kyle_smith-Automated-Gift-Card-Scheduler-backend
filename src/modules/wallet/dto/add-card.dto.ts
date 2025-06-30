import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AddCardDto {
  @ApiProperty({ example: 'Sadman Sakib' })
  @IsString()
  @IsNotEmpty()
  billing_name: string;


  @ApiProperty({ example: '5555555555554444' })
  @IsString()
  @IsNotEmpty()
  card_number: string;

  @ApiProperty({ example: '122' })
  @IsString()
  @IsNotEmpty()
  card_cvc: string;

  @ApiProperty({ example: '12' })
  @IsString()
  @IsNotEmpty()
  card_exp_month: string;

  @ApiProperty({ example: '32' })
  @IsString()
  @IsNotEmpty()
  card_exp_year: string;
}
