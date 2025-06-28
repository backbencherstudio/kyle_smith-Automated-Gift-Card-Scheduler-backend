import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { QueueMonitoringService } from './queue-monitoring.service';
import { QueueStatusDto } from './dto/queue-status.dto';
import { GiftSchedulingStatusDto } from './dto/gift-scheduling-status.dto';
import { MonitoringStatsDto } from './dto/monitoring-stats.dto';

@ApiTags('Queue Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue-monitoring')
export class QueueMonitoringController {
  constructor(
    private readonly queueMonitoringService: QueueMonitoringService,
  ) {}

  @Get('queue-status')
  @ApiOperation({ summary: 'Get real-time queue status' })
  @ApiResponse({
    status: 200,
    description: 'Queue status retrieved successfully',
    type: QueueStatusDto,
  })
  async getQueueStatus(): Promise<QueueStatusDto> {
    return this.queueMonitoringService.getQueueStatus();
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
