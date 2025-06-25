import { Test, TestingModule } from '@nestjs/testing';
import { GiftRecipientService } from './gift-recipient.service';

describe('GiftRecipientService', () => {
  let service: GiftRecipientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GiftRecipientService],
    }).compile();

    service = module.get<GiftRecipientService>(GiftRecipientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
