import { Test, TestingModule } from '@nestjs/testing';
import { GiftRecipientController } from './gift-recipient.controller';

describe('GiftRecipientController', () => {
  let controller: GiftRecipientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftRecipientController],
    }).compile();

    controller = module.get<GiftRecipientController>(GiftRecipientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
