import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator';
import { QueueMonitoringService } from './queue-monitoring.service';
import { QueueStatusDto } from './dto/queue-status.dto';
import { GiftSchedulingStatusDto } from './dto/gift-scheduling-status.dto';
import { MonitoringStatsDto } from './dto/monitoring-stats.dto';
import { Role } from 'src/common/guard/role/role.enum';
import { UserGiftsDto } from './dto/user-gifts.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { JobRetryResponseDto } from './dto/job-retry-response.dto';
import { JobDeleteResponseDto } from './dto/job-delete-response.dto';

@ApiTags('Queue Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue-monitoring')
export class QueueMonitoringController {
  constructor(
    private readonly queueMonitoringService: QueueMonitoringService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get basic queue status (User)' })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
    type: QueueStatusDto,
  })
  async getQueueStatus(): Promise<QueueStatusDto> {
    return this.queueMonitoringService.getQueueStatus();
  }

  @Get('my-gifts')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get user scheduled gifts with status' })
  @ApiResponse({
    status: 200,
    description: 'User gifts retrieved successfully',
    type: UserGiftsDto,
  })
  async getMyGifts(@GetUser() user: any): Promise<UserGiftsDto> {
    return this.queueMonitoringService.getUserGifts(user.userId);
  }

  @Get('admin-dashboard')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard (status + jobs combined)' })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard retrieved successfully',
    type: AdminDashboardDto,
  })
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    return this.queueMonitoringService.getAdminDashboard();
  }

  @Post('admin/jobs/:id/retry')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a specific failed job (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Job retried successfully',
    type: JobRetryResponseDto,
  })
  async retryJob(@Param('id') id: string): Promise<JobRetryResponseDto> {
    return this.queueMonitoringService.retryJob(id);
  }

  @Delete('admin/jobs/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job and store in database (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Job deleted successfully',
    type: JobDeleteResponseDto,
  })
  async deleteJob(@Param('id') id: string): Promise<JobDeleteResponseDto> {
    return this.queueMonitoringService.deleteJob(id);
  }

  @Get('queue-metrics')
  @ApiOperation({ summary: 'Get simplified queue metrics' })
  @ApiResponse({
    status: 200,
    description: 'Queue metrics retrieved successfully',
  })
  async getQueueMetrics() {
    return this.queueMonitoringService.getQueueMetrics();
  }

  @Get('scheduling-status')
  @ApiOperation({ summary: 'Get gift scheduling status' })
  @ApiResponse({
    status: 200,
    description: 'Scheduling status retrieved successfully',
    type: GiftSchedulingStatusDto,
  })
  async getSchedulingStatus(): Promise<GiftSchedulingStatusDto> {
    return this.queueMonitoringService.getGiftSchedulingStatus();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get combined monitoring statistics' })
  @ApiResponse({
    status: 200,
    description: 'Monitoring stats retrieved successfully',
    type: MonitoringStatsDto,
  })
  async getMonitoringStats(): Promise<MonitoringStatsDto> {
    return this.queueMonitoringService.getMonitoringStats();
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs (paginated)' })
  @ApiResponse({ status: 200, description: 'All jobs retrieved successfully' })
  async getAllJobs(
    @Query('start') start = 0,
    @Query('end') end = 49, // default: first 50 jobs
  ) {
    return this.queueMonitoringService.getAllJobs(start, end);
  }

  @Get('jobs/:status')
  @ApiOperation({ summary: 'Get jobs by status (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved successfully',
  })
  async getJobDetails(
    @Param('status')
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    @Query('start') start = 0,
    @Query('end') end = 49,
  ) {
    return this.queueMonitoringService.getJobDetails(status, start, end);
  }

  @Get('job/:id')
  @ApiOperation({ summary: 'Get details of a specific job by ID' })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved successfully',
  })
  async getJobById(@Param('id') id: string) {
    return this.queueMonitoringService.getJobById(id);
  }

  @Post('retry-failed-jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry all failed jobs' })
  @ApiResponse({ status: 200, description: 'Failed jobs retried successfully' })
  async retryFailedJobs() {
    return this.queueMonitoringService.retryFailedJobs();
  }
}
