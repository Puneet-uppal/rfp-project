import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Proposal, ProposalItem, Rfp, RfpItem, RfpVendor, Vendor } from '../../database/models';
import { ProposalService } from './proposal.service';
import { ProposalController } from './proposal.controller';
import { AiModule } from '../ai/ai.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Proposal, ProposalItem, Rfp, RfpItem, RfpVendor, Vendor]),
    AiModule,
    EmailModule,
  ],
  controllers: [ProposalController],
  providers: [ProposalService],
  exports: [ProposalService],
})
export class ProposalModule {}
