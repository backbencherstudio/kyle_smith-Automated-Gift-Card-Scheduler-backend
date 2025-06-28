import { ApiProperty } from '@nestjs/swagger';
import { QueueStatusDto } from './queue-status.dto';
import { GiftSchedulingStatusDto } from './gift-scheduling-status.dto';

export class MonitoringStatsDto {
  @ApiProperty({ description: 'Queue status information' })
  queueStatus: QueueStatusDto;

  @ApiProperty({ description: 'Gift scheduling status information' })
  schedulingStatus: GiftSchedulingStatusDto;

  @ApiProperty({ description: 'Overall system health' })
  systemHealth: 'healthy' | 'warning' | 'critical';

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}
