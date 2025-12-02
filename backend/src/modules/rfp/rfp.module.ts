import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Rfp, RfpItem, RfpVendor, Vendor } from '../../database/models';
import { RfpService } from './rfp.service';
import { RfpController } from './rfp.controller';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';
import { VendorModule } from '../vendor/vendor.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Rfp, RfpItem, RfpVendor, Vendor]),
    AiModule,
    EmailModule,
    VendorModule,
  ],
  controllers: [RfpController],
  providers: [RfpService],
  exports: [RfpService],
})
export class RfpModule {}
