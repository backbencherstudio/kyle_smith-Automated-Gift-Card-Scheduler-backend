import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueStatusDto } from './dto/queue-status.dto';
import { GiftSchedulingStatusDto } from './dto/gift-scheduling-status.dto';
import { MonitoringStatsDto } from './dto/monitoring-stats.dto';

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);
  private dayjs: any;

  constructor(
    @InjectQueue('gift-scheduling-mail-queue') private giftQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
    this.initializeDayjs();
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
      count: jobs.length,
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
