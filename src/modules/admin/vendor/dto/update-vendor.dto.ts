import { PartialType } from '@nestjs/swagger';
import { CreateVendorDto } from './create-vendor.dto';

/**
 * Update Vendor DTO
 * Extends CreateVendorDto with all fields optional
 */
export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
