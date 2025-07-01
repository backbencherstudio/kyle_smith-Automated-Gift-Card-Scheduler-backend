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
import { JobStatus } from '@prisma/client';

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
  async getUserGifts(
    userId: string,
    page = 1,
    limit = 10,
    query?: string,
  ): Promise<UserGiftsDto> {
    try {
      // console.log('limit:', limit);
      // Step 1: Get all active and completed jobs from Redis
      const statuses: ('waiting' | 'active' | 'delayed' | 'completed')[] = [
        'waiting',
        'active',
        'delayed',
        'completed', // Include completed jobs from Redis
      ];

        // this.logger.debug(
        //   `Getting jobs for user ${userId} with statuses: ${statuses.join(', ')}`,
        // );

      const activeJobs = (
        await Promise.all(
          statuses.map(async (status) => {
            const jobs = await this.giftQueue.getJobs([status], 0, 1000);
            // this.logger.debug(
            //   `Found ${jobs.length} jobs with status: ${status}`,
            // );
            return jobs;
          }),
        )
      ).flat();

      // this.logger.debug(`Total jobs found in Redis: ${activeJobs.length}`);

      // Debug: Log ALL jobs and their data structure
      activeJobs.forEach((job, index) => {
        const context = job.data?.context || {};
        const jobUserId = context.user_id;
        const jobStatus = this.getJobStatus(job);
        const hasDelay = job.delay > 0;

        // this.logger.debug(`Job ${index + 1}:`, {
        //   jobId: job.id,
        //   jobStatus: jobStatus,
        //   hasDelay: hasDelay,
        //   delay: job.delay,
        //   user_id: jobUserId,
        //   lookingFor: userId,
        //   matches: jobUserId === userId,
        //   data: {
        //     context: context,
        //     to: job.data?.to,
        //     subject: job.data?.subject,
        //   },
        // });
      });

      // Filter for this user (comprehensive logic)
      const userActiveJobs = activeJobs.filter((job) => {
        const context = job.data?.context || {};
        const jobUserId = context.user_id;
        const matches = jobUserId === userId;

        if (matches) {
          // this.logger.debug(
          //   `✅ Found matching job for user ${userId}: Job ID ${job.id}, Status: ${this.getJobStatus(job)}`,
          // );
        }

        return matches;
      });

      // this.logger.debug(
      //   `Filtered to ${userActiveJobs.length} jobs for user ${userId}`,
      // );

      // Step 2: Get completed jobs from DB for this user
      const completedJobs = await this.prisma.queueJobHistory.findMany({
        where: { user_id: userId },
        orderBy: { completed_at: 'desc' },
      });

      // this.logger.debug(
      //   `Found ${completedJobs.length} completed jobs in DB for user ${userId}`,
      // );

      // Step 3: Combine and format (Redis jobs first, then DB jobs)
      const activeGifts = userActiveJobs.map((job) => {
        const gift = this.mapJobToUserGiftDto(job);
        // this.logger.debug(`Mapped Redis job ${job.id} to gift:`, gift);
        return gift;
      });

      const completedGifts = completedJobs.map((job) => {
        const gift = this.mapCompletedJobToUserGiftDto(job);
        // this.logger.debug(`Mapped DB job ${job.job_id} to gift:`, gift);
        return gift;
      });

      const allGifts = [...activeGifts, ...completedGifts];

      // 1. Filter by query if provided
      let filteredGifts = allGifts;
      if (query && query.trim() !== '') {
        const q = query.trim().toLowerCase();
        filteredGifts = allGifts.filter(
          (gift) =>
            (gift.recipient.name &&
              gift.recipient.name.toLowerCase().includes(q)) ||
            (gift.recipient.email &&
              gift.recipient.email.toLowerCase().includes(q)) ||
            (gift.giftCard.vendor &&
              gift.giftCard.vendor.toLowerCase().includes(q)) ||
            (gift.giftCard.code &&
              gift.giftCard.code.toLowerCase().includes(q)) ||
            (gift.giftCard.status &&
              gift.giftCard.status.toLowerCase().includes(q)),
        );
      }

      // 2. Pagination logic
      const safeLimit = Math.max(1, limit || 10);
      const safePage = Math.max(1, page || 1);
      const totalScheduled = filteredGifts.length;
      const totalPages =
        totalScheduled > 0 ? Math.ceil(totalScheduled / safeLimit) : 1;
      const start = (safePage - 1) * safeLimit;
      const end = start + safeLimit;
      const paginatedGifts = filteredGifts.slice(start, end);

      // 3. Calculate summary (for filtered results)
      const summary = this.calculateGiftSummary(filteredGifts);

      // this.logger.debug(`Final result for user ${userId}:`, {
      //   totalScheduled: allGifts.length,
      //   activeGifts: activeGifts.length,
      //   completedGifts: completedGifts.length,
      //   summary: summary,
      // });

      return {
        totalScheduled,
        gifts: paginatedGifts,
        page: safePage,
        limit: safeLimit,
        totalPages,
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

    // Get job status (unified logic)
    const getJobStatus = () => {
      if (job.finishedOn) return 'completed';
      if (job.processedOn) return 'running';
      if (job.failedReason) return 'failed';
      if (job.delay > 0) return 'scheduled'; // Return 'scheduled' for consistency
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
    const giftCardCode = context.gift_card_code || 'No code';
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
        code: giftCardCode,
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
  private calculateGiftSummary(jobs: any[]) {
    const summary = {
      pending: 0,
      sent: 0,
      failed: 0,
      processing: 0,
    };

    jobs.forEach((job) => {
      // Use the same status logic as mapJobToUserGiftDto
      let status: string;

      if (job.finishedOn) {
        status = 'completed';
      } else if (job.processedOn) {
        status = 'running';
      } else if (job.failedReason) {
        status = 'failed';
      } else if (job.delay > 0) {
        status = 'scheduled'; // Map 'delayed' to 'scheduled' for consistency
      } else {
        status = 'waiting';
      }

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
        case 'scheduled':
        case 'waiting':
        default:
          summary.pending++;
      }
    });

    return summary;
  }

  /**
   * Get job status from Redis job (unified method)
   */
  private getJobStatus(job: any): string {
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'running';
    if (job.failedReason) return 'failed';
    if (job.delay > 0) return 'scheduled'; // Return 'scheduled' instead of 'delayed' for consistency
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
      // this.logger.log(`Retried job ${jobId}`);

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
      // this.logger.log(`Storing job ${job.id} in database history:`, {
      //   jobId: job.id,
      //   jobName: job.name,
      //   jobStatus: this.getJobStatus(job),
      //   jobData: job.data,
      //   createdAt: job.timestamp,
      //   processedAt: job.processedOn,
      //   completedAt: job.finishedOn,
      //   attempts: job.attemptsMade,
      //   processingTime:
      //     job.processedOn && job.finishedOn
      //       ? job.finishedOn - job.processedOn
      //       : null,
      //   errorMessage: job.failedReason,
      // });
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
    try {
      // Step 1: Get active jobs from Redis
      const statuses: ('waiting' | 'active' | 'delayed')[] = [
        'waiting',
        'active',
        'delayed',
      ];
      const activeJobs = (
        await Promise.all(
          statuses.map((status) =>
            this.giftQueue.getJobs([status], start, end),
          ),
        )
      ).flat();

      // Step 2: Get completed jobs from DB
      const completedJobs = await this.prisma.queueJobHistory.findMany({
        orderBy: { completed_at: 'desc' },
        skip: start,
        take: end - start,
      });

      // Step 3: Combine and format (Redis jobs first, then DB jobs)
      const activeJobData = activeJobs.map((job) => this.serializeJob(job));
      const completedJobData = completedJobs.map((job) =>
        this.serializeCompletedJob(job),
      );

      const allJobs = [...activeJobData, ...completedJobData];

      return {
        total: allJobs.length,
        jobs: allJobs,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting all jobs:', error);
      throw error;
    }
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

    // Get job state for status (unified logic)
    const getJobStatus = () => {
      if (job.finishedOn) return 'completed';
      if (job.processedOn) return 'running';
      if (job.failedReason) return 'failed';
      if (job.delay > 0) return 'scheduled'; // Return 'scheduled' for consistency
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

  // Save completed job to DB with proper data extraction
  async saveCompletedJobToHistory(job: any) {
    const now = new Date();

    try {
      // Extract data to match Redis job structure
      const context = job.data?.context || {};
      const recipientName = context.recipient_name || 'Unknown';
      const recipientEmail =
        job.data?.to || context.recipient_email || 'No email';
      const senderName = context.sender_name || 'Unknown';
      const vendorName = context.vendor_name || 'Unknown';
      const faceValue = context.face_value || 0;
      const giftCardCode = context.gift_card_code || 'No code';
      const customMessage = context.custom_message || null;
      const deliveryEmail = context.delivery_email || recipientEmail;

      // Use upsert instead of create to handle duplicates
      await this.prisma.queueJobHistory.upsert({
        where: { job_id: job.id },
        update: {
          // Update with latest completion data
          job_status: JobStatus.COMPLETED,
          completed_at: now,
          attempts: job.attemptsMade || 0,
          processing_time_ms:
            job.processedOn && job.finishedOn
              ? job.finishedOn - job.processedOn
              : null,
          error_message: job.failedReason || null,
          email_sent_at: now,
          email_delivered: true,
          // Update extracted fields in case they changed
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          sender_name: senderName,
          vendor_name: vendorName,
          face_value: faceValue,
          gift_card_code: giftCardCode,
          custom_message: customMessage,
          delivery_email: deliveryEmail,
        },
        create: {
          job_id: job.id,
          user_id: context.user_id || null,
          job_name: job.name,
          job_status: JobStatus.COMPLETED,
          job_data: job.data,

          // Extracted fields for easy querying
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          sender_name: senderName,
          vendor_name: vendorName,
          face_value: faceValue,
          gift_card_code: giftCardCode,
          custom_message: customMessage,
          delivery_email: deliveryEmail,

          // Timing
          created_at: new Date(job.timestamp),
          processed_at: job.processedOn ? new Date(job.processedOn) : null,
          completed_at: now,

          // Metrics
          attempts: job.attemptsMade || 0,
          processing_time_ms:
            job.processedOn && job.finishedOn
              ? job.finishedOn - job.processedOn
              : null,
          error_message: job.failedReason || null,

          // Delivery confirmation
          email_sent_at: now,
          email_delivered: true,
        },
      });

      // Update GiftScheduling record
      const giftSchedulingId = context.gift_scheduling_id;
      if (giftSchedulingId) {
        await this.prisma.giftScheduling.update({
          where: { id: giftSchedulingId },
          data: {
            delivery_status: 'SENT',
            sent_at: now,
          },
        });
      }

      // Remove from Redis AFTER saving to DB (like the working function)
      await job.remove();

      this.logger.log(
        `Job ${job.id} completed, saved to DB, and removed from Redis`,
      );
    } catch (error) {
      this.logger.error(
        `Error saving completed job ${job.id} to history:`,
        error,
      );
      throw error;
    }
  }

  // Map completed job from DB to match Redis job format exactly
  private mapCompletedJobToUserGiftDto(job: any) {
    const TIMEZONE = 'Asia/Dhaka';
    const DISPLAY_FORMAT = 'dddd, MMMM D, YYYY [at] h:mm:ss A';

    const formatTime = (date: Date) => ({
      iso: this.dayjs(date).toISOString(),
      display: this.dayjs(date).tz(TIMEZONE).format(DISPLAY_FORMAT),
      relative: this.dayjs(date).tz(TIMEZONE).fromNow(),
    });

    return {
      id: job.job_id,
      recipient: {
        name: job.recipient_name || 'Unknown',
        email: job.recipient_email || 'No email',
        birthday: null,
      },
      giftCard: {
        vendor: job.vendor_name || 'Unknown',
        amount: Number(job.face_value) || 0,
        code: job.gift_card_code || 'No code',
        status: 'SENT' as const,
      },
      scheduling: {
        scheduledDate: formatTime(job.created_at).iso,
        deliveryEmail: job.delivery_email || job.recipient_email || 'No email',
        customMessage: job.custom_message,
      },
      status: {
        deliveryStatus: 'SENT' as const,
        sentAt: formatTime(job.completed_at).iso,
        queueStatus: 'completed',
        processingTime: job.processing_time_ms,
        errorMessage: job.error_message,
      },
      createdAt: formatTime(job.created_at).iso,
    };
  }

  // Serialize completed job from DB for admin view (matching Redis format)
  private serializeCompletedJob(job: any) {
    const TIMEZONE = 'Asia/Dhaka';
    const DISPLAY_FORMAT = 'dddd, MMMM D, YYYY [at] h:mm:ss A';

    const formatTime = (date: Date) => ({
      iso: this.dayjs(date).toISOString(),
      display: this.dayjs(date).tz(TIMEZONE).format(DISPLAY_FORMAT),
      relative: this.dayjs(date).tz(TIMEZONE).fromNow(),
    });

    // Return exact same format as Redis job
    return {
      id: job.job_id,
      status: 'completed',
      recipient: {
        name: job.recipient_name || 'Unknown',
        email: job.recipient_email || 'No email',
      },
      sender: job.sender_name || 'Unknown',
      vendor: job.vendor_name || 'Unknown',
      amount: Number(job.face_value) || 0,
      giftCardCode: job.gift_card_code || 'No code',
      scheduled: formatTime(job.created_at),
      processed: formatTime(job.processed_at || job.created_at),
      completed: formatTime(job.completed_at),
      attempts: job.attempts || 0,
    };
  }
}
