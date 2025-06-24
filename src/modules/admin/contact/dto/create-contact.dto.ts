import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'First name of the contact' })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last name of the contact' })
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty({ description: 'Email address of the contact' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the contact', required: false })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ description: 'Message from the contact' })
  @IsNotEmpty()
  @IsString()
  message: string;
}
