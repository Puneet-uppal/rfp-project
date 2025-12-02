import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ComparisonService } from './comparison.service';

@ApiTags('Comparison')
@Controller('comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Get(':rfpId')
  @ApiOperation({ summary: 'Compare proposals for an RFP' })
  @ApiParam({ name: 'rfpId', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'Proposal comparison data' })
  async compareProposals(@Param('rfpId', ParseUUIDPipe) rfpId: string) {
    return this.comparisonService.compareProposals(rfpId);
  }

  @Post(':rfpId/recommend')
  @ApiOperation({ summary: 'Get AI recommendation for an RFP' })
  @ApiParam({ name: 'rfpId', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'AI recommendation' })
  async getRecommendation(
    @Param('rfpId', ParseUUIDPipe) rfpId: string,
    @Body('priorities') priorities?: string[],
  ) {
    return this.comparisonService.getAiRecommendation(rfpId, priorities);
  }

  @Post(':rfpId/full')
  @ApiOperation({ summary: 'Get full comparison with AI recommendation' })
  @ApiParam({ name: 'rfpId', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'Full comparison with AI recommendation' })
  async getFullComparison(
    @Param('rfpId', ParseUUIDPipe) rfpId: string,
    @Body('priorities') priorities?: string[],
  ) {
    return this.comparisonService.getFullComparison(rfpId, priorities);
  }
}

