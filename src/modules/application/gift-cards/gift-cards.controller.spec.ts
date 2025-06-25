import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardsController } from './gift-cards.controller';

describe('GiftCardsController', () => {
  let controller: GiftCardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftCardsController],
    }).compile();

    controller = module.get<GiftCardsController>(GiftCardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
