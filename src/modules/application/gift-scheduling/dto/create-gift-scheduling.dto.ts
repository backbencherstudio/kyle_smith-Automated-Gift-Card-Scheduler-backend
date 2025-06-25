import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientDto {
  @ApiProperty({ description: 'Recipient name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Recipient email' })
  @IsString()
  email: string;
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

  @ApiProperty({ description: 'Scheduled delivery date' })
  @IsDateString()
  scheduled_date: Date | string;

  @ApiProperty({ description: 'Custom message with gift (optional)' })
  @IsOptional()
  @IsString()
  custom_message?: string;
}
