import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
} from 'class-validator';

/**
 * Create Vendor DTO
 * Used for creating new vendor records
 */
export class CreateVendorDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Vendor name (e.g., Amazon, Walmart, Target)',
    example: 'Amazon',
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Vendor description',
    example: 'Amazon.com gift cards',
    required: false,
  })
  description?: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({
    description: 'Vendor website URL',
    example: 'https://amazon.com',
    required: false,
  })
  website?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Vendor logo filename',
    example: 'amazon-logo.png',
    required: false,
  })
  logo?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Whether vendor is active',
    example: '1',
    required: false,
  })
  is_active?: string;
}
