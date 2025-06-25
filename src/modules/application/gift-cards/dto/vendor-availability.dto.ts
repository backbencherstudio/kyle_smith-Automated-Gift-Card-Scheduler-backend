import { IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class VendorAvailabilityDto {
  @IsString() vendor_id: string;
  @Type(() => Number) @IsNumber() face_value: number;
}
