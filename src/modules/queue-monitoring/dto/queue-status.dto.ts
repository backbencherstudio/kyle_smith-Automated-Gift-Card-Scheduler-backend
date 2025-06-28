import { ApiProperty } from '@nestjs/swagger';

export class QueueStatusDto {
  @ApiProperty({ description: 'Queue name' })
  name: string;

  @ApiProperty({ description: 'Waiting jobs count' })
  waiting: number;

  @ApiProperty({ description: 'Active jobs count' })
  active: number;

  @ApiProperty({ description: 'Completed jobs count' })
  completed: number;

  @ApiProperty({ description: 'Failed jobs count' })
  failed: number;

  @ApiProperty({ description: 'Delayed jobs count' })
  delayed: number;

  @ApiProperty({ description: 'Paused jobs count' })
  paused: number;

  @ApiProperty({ description: 'Queue health status' })
  health: 'healthy' | 'warning' | 'critical';

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}
