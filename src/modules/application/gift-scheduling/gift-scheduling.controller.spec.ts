import { Test, TestingModule } from '@nestjs/testing';
import { GiftSchedulingController } from './gift-scheduling.controller';

describe('GiftSchedulingController', () => {
  let controller: GiftSchedulingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftSchedulingController],
    }).compile();

    controller = module.get<GiftSchedulingController>(GiftSchedulingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
