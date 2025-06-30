import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsEmail,
  IsNotEmpty,
  Matches,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientDto {
  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Recipient email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Recipient birthday in YYYY-MM-DD format',
    example: '1998-12-05',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Birthday must be in YYYY-MM-DD format',
  })
  birthday: string;
}

export class CreateGiftSchedulingDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  vendor_id: string;

  @ApiProperty({ description: 'Gift card amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Recipient details (object)' })
  @ValidateNested()
  @Type(() => RecipientDto)
  recipient: RecipientDto;

  @ApiProperty({
    description:
      'Send gift date in YYYY-MM-DD format (for scheduling calculation)',
    example: '2024-12-05',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Send gift date must be in YYYY-MM-DD format',
  })
  send_gift_date: string;

  @ApiProperty({
    description: 'Whether to send notification email when gift is delivered',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_notify?: boolean;

  @ApiProperty({ description: 'Custom message with gift (optional)' })
  @IsOptional()
  @IsString()
  custom_message?: string;
}
