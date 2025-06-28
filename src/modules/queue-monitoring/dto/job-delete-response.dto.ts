import { ApiProperty } from '@nestjs/swagger';

export class JobDeleteResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Job ID' })
  jobId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Whether job was stored in database' })
  storedInDB: boolean;
}
