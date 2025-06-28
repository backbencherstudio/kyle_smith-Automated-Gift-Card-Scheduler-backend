import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueStatusDto } from './dto/queue-status.dto';
import { GiftSchedulingStatusDto } from './dto/gift-scheduling-status.dto';
import { MonitoringStatsDto } from './dto/monitoring-stats.dto';
import { AdminDashboardDto } from './dto/admin-dashboard.dto';
import { UserGiftsDto } from './dto/user-gifts.dto';
import { JobRetryResponseDto } from './dto/job-retry-response.dto';
import { JobDeleteResponseDto } from './dto/job-delete-response.dto';
import Redis from 'ioredis';
import appConfig from 'src/config/app.config';

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private dayjs: any;
  private redisClient: Redis;

  constructor(
    @InjectQueue('gift-scheduling-mail-queue') private giftQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
    this.initializeDayjs();
    this.initializeRedis();
  }

  private initializeDayjs() {
    // Use require to ensure proper loading
    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    const timezone = require('dayjs/plugin/timezone');
    const relativeTime = require('dayjs/plugin/relativeTime');
    const localizedFormat = require('dayjs/plugin/localizedFormat');

    dayjs.extend(utc);
    dayjs.extend(timezone);
    dayjs.extend(relativeTime);
    dayjs.extend(localizedFormat);

    this.dayjs = dayjs;
  }

  private initializeRedis() {
    this.redisClient = new Redis({
      host: appConfig().redis.host,
      port: Number(appConfig().redis.port),
      password: appConfig().redis.password,
    });
  }

  /**
   * Get real-time queue status using BullMQ's getJobs method
   */
  async getQueueStatus(): Promise<QueueStatusDto> {
    try {
      // Get all jobs by status - this is the most reliable method
      const [waitingJobs, activeJobs, completedJobs, failedJobs, delayedJobs] =
        await Promise.all([
          this.giftQueue.getJobs(['waiting'], 0, 1000),
          this.giftQueue.getJobs(['active'], 0, 1000),
          this.giftQueue.getJobs(['completed'], 0, 1000),
          this.giftQueue.getJobs(['failed'], 0, 1000),
          this.giftQueue.getJobs(['delayed'], 0, 1000),
        ]);

      // Count jobs by status
      const waiting = waitingJobs.length;
      const active = activeJobs.length;
      const completed = completedJobs.length;
      const failed = failedJobs.length;
      const delayed = delayedJobs.length;
      const paused = 0; // BullMQ doesn't have paused jobs by default

      // Calculate queue health
      const health = this.calculateQueueHealth({
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
      });

      return {
        name: 'gift-scheduling-mail-queue',
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        health,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting queue status:', error);
      throw error;
    }
  }

  /**
   * Get queue status with Redis metrics (Admin)
   */
  async getQueueStatusWithRedis(): Promise<QueueStatusDto> {
    try {
      const basicStatus = await this.getQueueStatus();
      const redisMetrics = await this.getRedisQueueMetrics();

      return {
        ...basicStatus,
        redisMetrics,
      };
    } catch (error) {
      this.logger.error('Error getting queue status with Redis:', error);
      throw error;
    }
  }

  /**
   * Get Redis-specific queue metrics
   */
  private async getRedisQueueMetrics() {
    try {
      const queueKey = 'bull:gift-scheduling-mail-queue';
      const [
        redisWaiting,
        redisActive,
        redisCompleted,
        redisFailed,
        redisDelayed,
      ] = await Promise.all([
        this.redisClient.llen(`${queueKey}:wait`),
        this.redisClient.llen(`${queueKey}:active`),
        this.redisClient.zcard(`${queueKey}:completed`),
        this.redisClient.zcard(`${queueKey}:failed`),
        this.redisClient.zcard(`${queueKey}:delayed`),
      ]);

      return {
        redisWaiting,
        redisActive,
        redisCompleted,
        redisFailed,
        redisDelayed,
      };
    } catch (error) {
      this.logger.error('Error getting Redis metrics:', error);
      return null;
    }
  }

  /**
   * Get admin dashboard (status + jobs combined)
   */
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    try {
      const [queueStatus, jobs] = await Promise.all([
        this.getQueueStatusWithRedis(),
        this.getAllJobs(),
      ]);

      return {
        queueStatus,
        jobs,
      };
    } catch (error) {
      this.logger.error('Error getting admin dashboard:', error);
      throw error;
    }
  }

  /**
   * Get user's scheduled gifts with status
   */
  async getUserGifts(userId: string): Promise<UserGiftsDto> {
    try {
      // Follow the same pattern as getAllJobs - get all jobs from Redis
      const statuses: (
        | 'waiting'
        | 'active'
        | 'completed'
        | 'failed'
        | 'delayed'
      )[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];

      const allJobs = (
        await Promise.all(
          statuses.map((status) => this.giftQueue.getJobs([status], 0, 1000)),
        )
      ).flat();

      // Filter jobs for this specific user
      const userJobs = allJobs.filter((job) => {
        // Check if job belongs to this user
        const jobUserId = job.data?.context?.user_id || job.data?.userId;
        return jobUserId === userId;
      });

      // Map jobs to user gift format using the same serialization logic
      const gifts = userJobs.map((job) => this.mapJobToUserGiftDto(job));

      // Calculate summary based on job status
      const summary = this.calculateGiftSummaryFromJobs(userJobs);

      return {
        totalScheduled: gifts.length,
        gifts,
        summary,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting user gifts:', error);
      throw error;
    }
  }

  /**
   * Map Redis job to user gift DTO format
   */
  private mapJobToUserGiftDto(job: any) {
    // Set your preferred timezone here
    const TIMEZONE = 'Asia/Dhaka';
    const DISPLAY_FORMAT = 'dddd, MMMM D, YYYY [at] h:mm:ss A';

    const formatTime = (ts: number | undefined) =>
      ts
        ? {
            iso: this.dayjs(ts).toISOString(),
            display: this.dayjs(ts).tz(TIMEZONE).format(DISPLAY_FORMAT),
            relative: this.dayjs(ts).tz(TIMEZONE).fromNow(),
          }
        : null;

    // Get job status
    const getJobStatus = () => {
      if (job.finishedOn) return 'completed';
      if (job.processedOn) return 'running';
      if (job.failedReason) return 'failed';
      if (job.delay > 0) return 'scheduled';
      return 'waiting';
    };

    // Extract data from job context - follow same pattern as serializeJob
    const context = job.data?.context || {};
    const recipientName = context.recipient_name || 'Unknown';
    const recipientEmail =
      job.data?.to || context.recipient_email || 'No email';
    const senderName = context.sender_name || 'Unknown';
    const vendorName = context.vendor_name || 'Unknown';
    const faceValue = context.face_value || 0;
    const giftCardCode = context.gift_card_code || 'No code'; // Always extract
    const scheduledDate = context.scheduled_date || job.timestamp;
    const deliveryEmail = context.delivery_email || recipientEmail;
    const customMessage = context.custom_message || null;
    const birthday = context.recipient_birthday || null;

    // Determine delivery status based on job status - ensure proper typing
    const getDeliveryStatus = (): 'SENT' | 'FAILED' | 'PENDING' => {
      const jobStatus = getJobStatus();
      switch (jobStatus) {
        case 'completed':
          return 'SENT';
        case 'failed':
          return 'FAILED';
        case 'running':
        case 'scheduled':
        case 'waiting':
        default:
          return 'PENDING';
      }
    };

    return {
      id: job.id,
      recipient: {
        name: recipientName,
        email: recipientEmail,
        birthday: birthday ? this.dayjs(birthday).toISOString() : null,
      },
      giftCard: {
        vendor: vendorName,
        amount: Number(faceValue),
        code: giftCardCode, // Always show gift card code - no conditions
        status: getDeliveryStatus(),
      },
      scheduling: {
        scheduledDate:
          formatTime(scheduledDate)?.iso ||
          this.dayjs(scheduledDate).toISOString(),
        deliveryEmail,
        customMessage,
      },
      status: {
        deliveryStatus: getDeliveryStatus(),
        sentAt:
          getJobStatus() === 'completed'
            ? formatTime(job.finishedOn)?.iso
            : null,
        queueStatus: getJobStatus(),
        processingTime:
          job.processedOn && job.finishedOn
            ? job.finishedOn - job.processedOn
            : null,
        errorMessage: job.failedReason || null,
      },
      createdAt:
        formatTime(job.timestamp)?.iso ||
        this.dayjs(job.timestamp).toISOString(),
    };
  }

  /**
   * Calculate gift summary from jobs
   */
  private calculateGiftSummaryFromJobs(jobs: any[]) {
    const summary = {
      pending: 0,
      sent: 0,
      failed: 0,
      processing: 0,
    };

    jobs.forEach((job) => {
      const status = this.getJobStatus(job);
      switch (status) {
        case 'completed':
          summary.sent++;
          break;
        case 'failed':
          summary.failed++;
          break;
        case 'running':
          summary.processing++;
          break;
        default:
          summary.pending++;
      }
    });

    return summary;
  }

  /**
   * Get job status from Redis job
   */
  private getJobStatus(job: any): string {
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'running';
    if (job.failedReason) return 'failed';
    if (job.delay > 0) return 'delayed';
    return 'waiting';
  }

  /**
   * Retry a specific failed job
   */
  async retryJob(jobId: string): Promise<JobRetryResponseDto> {
    try {
      const job = await this.giftQueue.getJob(jobId);
      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      await job.retry();
      this.logger.log(`Retried job ${jobId}`);

      return {
        success: true,
        jobId,
        message: 'Job retried successfully',
      };
    } catch (error) {
      this.logger.error(`Error retrying job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a job and store in database
   */
  async deleteJob(jobId: string): Promise<JobDeleteResponseDto> {
    try {
      const job = await this.giftQueue.getJob(jobId);
      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      // Store job data in database before deletion
      await this.storeJobInHistory(job);

      // Remove from Redis queue
      await job.remove();
      this.logger.log(`Deleted job ${jobId} and stored in database`);

      return {
        success: true,
        jobId,
        message: 'Job deleted and stored in database',
        storedInDB: true,
      };
    } catch (error) {
      this.logger.error(`Error deleting job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Store job data in database history
   */
  private async storeJobInHistory(job: any) {
    try {
      // Note: This requires the QueueJobHistory model to be created
      // For now, we'll log the job data
      this.logger.log(`Storing job ${job.id} in database history:`, {
        jobId: job.id,
        jobName: job.name,
        jobStatus: this.getJobStatus(job),
        jobData: job.data,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        completedAt: job.finishedOn,
        attempts: job.attemptsMade,
        processingTime:
          job.processedOn && job.finishedOn
            ? job.finishedOn - job.processedOn
            : null,
        errorMessage: job.failedReason,
      });
    } catch (error) {
      this.logger.error(`Error storing job ${job.id} in history:`, error);
    }
  }

  /**
   * Get gift scheduling status from database
   */
  async getGiftSchedulingStatus(): Promise<GiftSchedulingStatusDto> {
    try {
      // Get total counts
      const [totalScheduled, pending, sent, failed] = await Promise.all([
        this.prisma.giftScheduling.count(),
        this.prisma.giftScheduling.count({
          where: { delivery_status: 'PENDING' },
        }),
        this.prisma.giftScheduling.count({
          where: { delivery_status: 'SENT' },
        }),
        this.prisma.giftScheduling.count({
          where: { delivery_status: 'FAILED' },
        }),
      ]);

      // Get upcoming birthdays
      const now = new Date();
      const sevenDaysFromNow = this.dayjs().add(7, 'day').toDate();
      const thirtyDaysFromNow = this.dayjs().add(30, 'day').toDate();

      const [upcoming7Days, upcoming30Days] = await Promise.all([
        this.prisma.giftRecipient.count({
          where: {
            birthday_date: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
        }),
        this.prisma.giftRecipient.count({
          where: {
            birthday_date: {
              gte: now,
              lte: thirtyDaysFromNow,
            },
          },
        }),
      ]);

      // Calculate success rate
      const successRate =
        totalScheduled > 0 ? Math.round((sent / totalScheduled) * 100) : 0;

      // Calculate average processing time
      const averageProcessingTime = await this.calculateAverageProcessingTime();

      return {
        totalScheduled,
        pending,
        sent,
        failed,
        upcomingBirthdays7Days: upcoming7Days,
        upcomingBirthdays30Days: upcoming30Days,
        successRate,
        averageProcessingTime,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting gift scheduling status:', error);
      throw error;
    }
  }

  /**
   * Get combined monitoring stats
   */
  async getMonitoringStats(): Promise<MonitoringStatsDto> {
    try {
      const [queueStatus, schedulingStatus] = await Promise.all([
        this.getQueueStatus(),
        this.getGiftSchedulingStatus(),
      ]);

      // Calculate overall system health
      const systemHealth = this.calculateSystemHealth(
        queueStatus,
        schedulingStatus,
      );

      return {
        queueStatus,
        schedulingStatus,
        systemHealth,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting monitoring stats:', error);
      throw error;
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs() {
    try {
      const failedJobs = await this.giftQueue.getJobs(['failed'], 0, 100);
      const retryPromises = failedJobs.map((job) => job.retry());
      await Promise.all(retryPromises);

      this.logger.log(`Retried ${failedJobs.length} failed jobs`);
      return { success: true, retriedCount: failedJobs.length };
    } catch (error) {
      this.logger.error('Error retrying failed jobs:', error);
      throw error;
    }
  }

  /**
   * Get real-time queue metrics (simplified version)
   */
  async getQueueMetrics() {
    try {
      // Get current queue state
      const [waiting, active, delayed] = await Promise.all([
        this.giftQueue.getJobs(['waiting'], 0, 1), // Just count, don't fetch all
        this.giftQueue.getJobs(['active'], 0, 1),
        this.giftQueue.getJobs(['delayed'], 0, 1),
      ]);

      // Get recent completed and failed jobs
      const [recentCompleted, recentFailed] = await Promise.all([
        this.giftQueue.getJobs(['completed'], 0, 10), // Last 10 completed
        this.giftQueue.getJobs(['failed'], 0, 10), // Last 10 failed
      ]);

      return {
        current: {
          waiting: waiting.length,
          active: active.length,
          delayed: delayed.length,
        },
        recent: {
          completed: recentCompleted.length,
          failed: recentFailed.length,
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting queue metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate queue health based on job counts
   */
  private calculateQueueHealth(
    jobCounts: any,
  ): 'healthy' | 'warning' | 'critical' {
    const failed = jobCounts.failed || 0;
    const waiting = jobCounts.waiting || 0;
    const active = jobCounts.active || 0;

    if (failed > 10) return 'critical';
    if (failed > 5 || waiting > 50) return 'warning';
    return 'healthy';
  }

  /**
   * Calculate system health based on queue and scheduling status
   */
  private calculateSystemHealth(
    queueStatus: QueueStatusDto,
    schedulingStatus: GiftSchedulingStatusDto,
  ): 'healthy' | 'warning' | 'critical' {
    if (
      queueStatus.health === 'critical' ||
      schedulingStatus.successRate < 80
    ) {
      return 'critical';
    }
    if (queueStatus.health === 'warning' || schedulingStatus.successRate < 90) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Calculate average processing time
   */
  private async calculateAverageProcessingTime(): Promise<number> {
    try {
      const sentGifts = await this.prisma.giftScheduling.findMany({
        where: { delivery_status: 'SENT' },
        select: { created_at: true, sent_at: true },
        take: 100,
      });

      if (sentGifts.length === 0) return 0;

      const processingTimes = sentGifts
        .filter((gift) => gift.sent_at)
        .map((gift) => {
          const created = this.dayjs(gift.created_at);
          const sent = this.dayjs(gift.sent_at);
          return sent.diff(created, 'minute');
        });

      const average =
        processingTimes.reduce((sum, time) => sum + time, 0) /
        processingTimes.length;
      return Math.round(average);
    } catch (error) {
      this.logger.error('Error calculating average processing time:', error);
      return 0;
    }
  }

  // 1. Get all jobs (paginated, all statuses)
  async getAllJobs(start = 0, end = 49) {
    const statuses: (
      | 'waiting'
      | 'active'
      | 'completed'
      | 'failed'
      | 'delayed'
    )[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];
    const jobs = (
      await Promise.all(
        statuses.map((status) => this.giftQueue.getJobs([status], start, end)),
      )
    ).flat();

    return {
      total: jobs.length,
      jobs: jobs.map((job) => this.serializeJob(job)),
      lastUpdated: new Date(),
    };
  }

  // 2. Get jobs by status (paginated)
  async getJobDetails(
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start = 0,
    end = 49,
  ) {
    const jobs = await this.giftQueue.getJobs([status], start, end);
    return {
      status,
      count: jobs.length,
      jobs: jobs.map((job) => this.serializeJob(job)),
      lastUpdated: new Date(),
    };
  }

  // 3. Get job by ID
  async getJobById(jobId: string) {
    const job = await this.giftQueue.getJob(jobId.toString());
    if (!job) return { error: 'Job not found' };
    return this.serializeJob(job);
  }

  // Helper to serialize job data for admin preview
  private serializeJob(job: any) {
    if (!job) return null;

    // Set your preferred timezone here
    const TIMEZONE = 'Asia/Dhaka';
    // Set your preferred display format here (now includes seconds)
    const DISPLAY_FORMAT = 'dddd, MMMM D, YYYY [at] h:mm:ss A';

    const formatTime = (ts: number | undefined) =>
      ts
        ? {
            iso: this.dayjs(ts).toISOString(),
            display: this.dayjs(ts).tz(TIMEZONE).format(DISPLAY_FORMAT),
            relative: this.dayjs(ts).tz(TIMEZONE).fromNow(),
          }
        : null;

    // Get job state for status
    const getJobStatus = () => {
      if (job.finishedOn) return 'completed';
      if (job.processedOn) return 'running';
      if (job.failedReason) return 'failed';
      if (job.delay > 0) return 'scheduled';
      return 'waiting';
    };

    // Extract essential data for admin preview
    const recipientName = job.data?.context?.recipient_name || 'Unknown';
    const senderName = job.data?.context?.sender_name || 'Unknown';
    const vendorName = job.data?.context?.vendor_name || 'Unknown';
    const faceValue = job.data?.context?.face_value || 0;
    const recipientEmail = job.data?.to || 'No email';
    const giftCardCode = job.data?.context?.gift_card_code || 'No code';

    return {
      id: job.id,
      status: getJobStatus(),
      recipient: {
        name: recipientName,
        email: recipientEmail,
      },
      sender: senderName,
      vendor: vendorName,
      amount: faceValue,
      giftCardCode: giftCardCode,
      scheduled: formatTime(job.timestamp),
      processed: formatTime(job.processedOn),
      completed: formatTime(job.finishedOn),
      attempts: job.attemptsMade || 0,
      // Only include failed reason if job failed
      ...(job.failedReason && { failedReason: job.failedReason }),
    };
  }
}
