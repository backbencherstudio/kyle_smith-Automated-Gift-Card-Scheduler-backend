import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsDateString } from 'class-validator';

export class CreateGiftRecipientDto {
  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Recipient phone number (optional)' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ description: 'Recipient birthday date' })
  @IsDateString()
  birthday_date: string;

  @ApiProperty({ description: 'Recipient address (optional)' })
  @IsOptional()
  @IsString()
  address?: string;
}
