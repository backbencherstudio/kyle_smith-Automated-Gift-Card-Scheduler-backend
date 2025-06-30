import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueMonitoringService } from 'src/modules/queue-monitoring/queue-monitoring.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('gift-scheduling-mail-queue')
export class GiftSchedulingMailProcessor extends WorkerHost {
  private readonly logger = new Logger(GiftSchedulingMailProcessor.name);

  constructor(
    private mailerService: MailerService,
    private queueMonitoringService: QueueMonitoringService,
    private prisma: PrismaService,
  ) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} with name ${job.name} completed`);

    try {
      // Save to DB and remove from Redis AFTER job is completed
      await this.queueMonitoringService.saveCompletedJobToHistory(job);

      // Handle sender notification for gift delivery
      if (job.name === 'sendGiftEmail') {
        await this.handleSenderNotification(job);
      }
    } catch (error) {
      this.logger.error(`Error in onCompleted for job ${job.id}:`, error);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: any) {
    this.logger.error(
      `Job ${job.id} with name ${job.name} failed with error: ${error.message}`,
    );
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} with name ${job.name}`);
    try {
      switch (job.name) {
        case 'sendGiftEmail':
          const { to, subject, template, context } = job.data;
          if (!to) {
            this.logger.error(
              'No recipient email provided for gift email job',
              job.data,
            );
            throw new Error('No recipient email provided for gift email job');
          }
          await this.mailerService.sendMail({
            to,
            subject,
            template,
            context,
          });
          break;
        default:
          this.logger.log('Unknown job name');
          return;
      }
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} with name ${job.name}`,
        error,
      );
      throw error;
    }
  }

  // New method to handle sender notification
  private async handleSenderNotification(job: Job) {
    try {
      const { context } = job.data;
      const { is_notify, user_id, gift_scheduling_id } = context;
      console.log("is notify from processor",is_notify);

      // Only send notification if is_notify is true
      if (is_notify !== false) {
        // Get updated schedule info
        const schedule = await this.prisma.giftScheduling.findUnique({
          where: { id: gift_scheduling_id },
          include: {
            recipient: true,
            inventory: {
              include: { vendor: true },
            },
            user: true,
          },
        });

        if (schedule && schedule.user?.email) {
          // Send sender notification email
          await this.mailerService.sendMail({
            to: schedule.user.email,
            subject: `✅ Gift Delivered to ${schedule.recipient.name}`,
            template: 'gift-delivery-sender-notification',
            context: {
              sender_name:
                schedule.user.name || schedule.user.email || 'Someone',
              recipient_name: schedule.recipient.name,
              recipient_email: schedule.recipient.email,
              vendor_name: schedule.inventory?.vendor?.name || 'Unknown Vendor',
              face_value: schedule.inventory?.face_value || 0,
              scheduled_date: schedule.scheduled_date,
              custom_message: schedule.custom_message,
              user_id: user_id,
              gift_scheduling_id: gift_scheduling_id,
            },
          });

          this.logger.log(
            `Sender notification sent to ${schedule.user.email} for gift ${gift_scheduling_id}`,
          );
        }
      } else {
        this.logger.log(
          `Sender notification skipped for gift ${gift_scheduling_id} (is_notify: false)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending sender notification for job ${job.id}:`,
        error,
      );
    }
  }
}
