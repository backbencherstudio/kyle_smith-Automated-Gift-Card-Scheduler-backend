import { Test, TestingModule } from '@nestjs/testing';
import { GiftLogService } from './gift-log.service';

describe('GiftLogService', () => {
  let service: GiftLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GiftLogService],
    }).compile();

    service = module.get<GiftLogService>(GiftLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
