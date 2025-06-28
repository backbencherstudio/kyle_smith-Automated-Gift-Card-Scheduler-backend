import { ApiProperty } from '@nestjs/swagger';

export class JobRetryResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Job ID' })
  jobId: string;

  @ApiProperty({ description: 'Response message' })
  message: string;
}
