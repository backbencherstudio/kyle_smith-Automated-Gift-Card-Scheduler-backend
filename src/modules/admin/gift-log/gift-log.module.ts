import { Module } from '@nestjs/common';
import { GiftLogController } from './gift-log.controller';
import { GiftLogService } from './gift-log.service';
import { WalletService } from 'src/modules/wallet/wallet.service';

@Module({
  controllers: [GiftLogController],
  providers: [GiftLogService, WalletService],
})
export class GiftLogModule {}
