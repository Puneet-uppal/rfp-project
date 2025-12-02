import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Proposal, ProposalItem, Rfp, RfpItem, Vendor } from '../../database/models';
import { ComparisonService } from './comparison.service';
import { ComparisonController } from './comparison.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Proposal, ProposalItem, Rfp, RfpItem, Vendor]),
    AiModule,
  ],
  controllers: [ComparisonController],
  providers: [ComparisonService],
  exports: [ComparisonService],
})
export class ComparisonModule {}
