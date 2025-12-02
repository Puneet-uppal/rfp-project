import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProposalService } from './proposal.service';

@ApiTags('Proposals')
@Controller('proposals')
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Get('rfp/:rfpId')
  @ApiOperation({ summary: 'Get all proposals for an RFP' })
  @ApiParam({ name: 'rfpId', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'List of proposals' })
  async findByRfp(@Param('rfpId', ParseUUIDPipe) rfpId: string) {
    return this.proposalService.findByRfp(rfpId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Proposal details' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalService.findOne(id);
  }

  @Post('manual')
  @ApiOperation({ summary: 'Create a manual proposal entry' })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  async createManual(
    @Body()
    body: {
      rfpId: string;
      vendorId: string;
      totalPrice?: number;
      currency?: string;
      deliveryDays?: number;
      paymentTerms?: string;
      warrantyTerms?: string;
      rawContent?: string;
      items?: Array<{
        name: string;
        quantity: number;
        unitPrice?: number;
        specifications?: Record<string, any>;
      }>;
    },
  ) {
    const { rfpId, vendorId, ...data } = body;
    return this.proposalService.createManualProposal(rfpId, vendorId, data);
  }

  @Post(':id/reparse')
  @ApiOperation({ summary: 'Re-parse a proposal using AI' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Proposal re-parsed' })
  async reparse(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalService.reparse(id);
  }

  @Post(':id/select')
  @ApiOperation({ summary: 'Select a proposal as winner' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 200, description: 'Proposal selected as winner' })
  async selectWinner(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalService.selectWinner(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal ID' })
  @ApiResponse({ status: 204, description: 'Proposal deleted' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.proposalService.remove(id);
  }
}

