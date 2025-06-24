import { ApiProperty } from '@nestjs/swagger';

export class BulkUploadGiftCardInventoryDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
