import { Test, TestingModule } from '@nestjs/testing';
import { GiftLogController } from './gift-log.controller';

describe('GiftLogController', () => {
  let controller: GiftLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftLogController],
    }).compile();

    controller = module.get<GiftLogController>(GiftLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
