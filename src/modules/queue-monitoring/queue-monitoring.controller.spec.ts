import { Test, TestingModule } from '@nestjs/testing';
import { QueueMonitoringController } from './queue-monitoring.controller';

describe('QueueMonitoringController', () => {
  let controller: QueueMonitoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueMonitoringController],
    }).compile();

    controller = module.get<QueueMonitoringController>(QueueMonitoringController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
