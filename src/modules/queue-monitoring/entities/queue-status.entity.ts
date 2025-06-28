import { ApiProperty } from '@nestjs/swagger';

export class QueueStatus {
  @ApiProperty() name: string;
  @ApiProperty() waiting: number;
  @ApiProperty() active: number;
  @ApiProperty() completed: number;
  @ApiProperty() failed: number;
  @ApiProperty() delayed: number;
  @ApiProperty() paused: number;
  @ApiProperty() health: 'healthy' | 'warning' | 'critical';
  @ApiProperty() lastUpdated: Date;
}
