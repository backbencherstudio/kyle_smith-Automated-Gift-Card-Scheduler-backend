import { ApiProperty } from '@nestjs/swagger';
import { QueueStatusDto } from './queue-status.dto';

export class AdminDashboardDto {
  @ApiProperty({ description: 'Queue status with Redis metrics' })
  queueStatus: QueueStatusDto;

  @ApiProperty({ description: 'All jobs with details' })
  jobs: {
    total: number;
    jobs: any[];
    lastUpdated: Date;
  };
}
