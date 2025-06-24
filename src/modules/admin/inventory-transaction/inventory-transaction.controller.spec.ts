import { Test, TestingModule } from '@nestjs/testing';
import { InventoryTransactionController } from './inventory-transaction.controller';

describe('InventoryTransactionController', () => {
  let controller: InventoryTransactionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryTransactionController],
    }).compile();

    controller = module.get<InventoryTransactionController>(InventoryTransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
