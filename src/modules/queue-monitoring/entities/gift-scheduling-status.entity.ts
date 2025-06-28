import { ApiProperty } from '@nestjs/swagger';

export class GiftSchedulingStatus {
  @ApiProperty() totalScheduled: number;
  @ApiProperty() pending: number;
  @ApiProperty() sent: number;
  @ApiProperty() failed: number;
  @ApiProperty() upcomingBirthdays7Days: number;
  @ApiProperty() upcomingBirthdays30Days: number;
  @ApiProperty() successRate: number;
  @ApiProperty() averageProcessingTime: number;
  @ApiProperty() lastUpdated: Date;
}
