import { Test, TestingModule } from '@nestjs/testing';
import { QueueMonitoringService } from './queue-monitoring.service';

describe('QueueMonitoringService', () => {
  let service: QueueMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueMonitoringService],
    }).compile();

    service = module.get<QueueMonitoringService>(QueueMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
