import { ApiProperty } from '@nestjs/swagger';

export class GiftSchedulingStatusDto {
  @ApiProperty({ description: 'Total scheduled gifts' })
  totalScheduled: number;

  @ApiProperty({ description: 'Pending deliveries' })
  pending: number;

  @ApiProperty({ description: 'Sent deliveries' })
  sent: number;

  @ApiProperty({ description: 'Failed deliveries' })
  failed: number;

  @ApiProperty({ description: 'Upcoming birthdays (next 7 days)' })
  upcomingBirthdays7Days: number;

  @ApiProperty({ description: 'Upcoming birthdays (next 30 days)' })
  upcomingBirthdays30Days: number;

  @ApiProperty({ description: 'Delivery success rate (%)' })
  successRate: number;

  @ApiProperty({ description: 'Average processing time (minutes)' })
  averageProcessingTime: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;
}
