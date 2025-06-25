import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('gift-scheduling-mail-queue')
export class GiftSchedulingMailProcessor extends WorkerHost {
  private readonly logger = new Logger(GiftSchedulingMailProcessor.name);
  constructor(private mailerService: MailerService) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} with name ${job.name} completed`);
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
}
