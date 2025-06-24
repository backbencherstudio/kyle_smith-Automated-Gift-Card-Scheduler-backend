import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardInventoryController } from './gift-card-inventory.controller';

describe('GiftCardInventoryController', () => {
  let controller: GiftCardInventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftCardInventoryController],
    }).compile();

    controller = module.get<GiftCardInventoryController>(GiftCardInventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
