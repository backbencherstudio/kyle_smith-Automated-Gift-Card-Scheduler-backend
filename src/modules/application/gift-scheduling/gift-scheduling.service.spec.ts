import { Test, TestingModule } from '@nestjs/testing';
import { GiftSchedulingService } from './gift-scheduling.service';

describe('GiftSchedulingService', () => {
  let service: GiftSchedulingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GiftSchedulingService],
    }).compile();

    service = module.get<GiftSchedulingService>(GiftSchedulingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
