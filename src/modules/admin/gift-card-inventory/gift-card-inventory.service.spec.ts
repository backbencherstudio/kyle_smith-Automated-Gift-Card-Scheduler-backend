import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardInventoryService } from './gift-card-inventory.service';

describe('GiftCardInventoryService', () => {
  let service: GiftCardInventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GiftCardInventoryService],
    }).compile();

    service = module.get<GiftCardInventoryService>(GiftCardInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
