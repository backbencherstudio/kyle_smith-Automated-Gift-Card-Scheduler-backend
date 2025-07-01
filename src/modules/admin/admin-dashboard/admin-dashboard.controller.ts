import { Controller, Get, Query } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';

@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  async getOverview(
    @Query('range') range: 'weekly' | 'monthly' | 'yearly' = 'weekly',
  ): Promise<DashboardOverviewDto> {
    return this.dashboardService.getOverview(range);
  }
}
