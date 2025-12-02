import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Proposal, ProposalItem, ProposalStatus, Rfp, RfpItem, Vendor } from '../../database/models';
import { AiService, ParsedProposal, ProposalEvaluation } from '../ai/ai.service';

export interface ComparisonResult {
  rfp: {
    id: string;
    title: string;
    budget?: number;
    deliveryDays?: number;
  };
  proposals: Array<{
    id: string;
    vendorName: string;
    vendorId: string;
    totalPrice?: number;
    deliveryDays?: number;
    score?: number;
    scoreBreakdown?: Proposal['aiScoreBreakdown'];
    strengths?: string[];
    weaknesses?: string[];
    status: ProposalStatus;
  }>;
  comparison: {
    priceComparison: Array<{
      vendorName: string;
      price?: number;
      percentOfBudget?: number;
      ranking: number;
    }>;
    deliveryComparison: Array<{
      vendorName: string;
      days?: number;
      meetsRequirement: boolean;
      ranking: number;
    }>;
    scoreComparison: Array<{
      vendorName: string;
      score?: number;
      ranking: number;
    }>;
  };
  aiRecommendation?: {
    recommendedVendor: string;
    reasoning: string;
    comparisonSummary: string;
    rankings: Array<{
      vendorName: string;
      rank: number;
      summary: string;
    }>;
  };
}

@Injectable()
export class ComparisonService {
  private readonly logger = new Logger(ComparisonService.name);

  constructor(
    @InjectModel(Proposal)
    private proposalModel: typeof Proposal,
    @InjectModel(Rfp)
    private rfpModel: typeof Rfp,
    private aiService: AiService,
  ) {}

  async compareProposals(rfpId: string): Promise<ComparisonResult> {
    const rfp = await this.rfpModel.findByPk(rfpId, {
      include: [{ model: RfpItem, as: 'items' }],
    });

    if (!rfp) {
      throw new NotFoundException(`RFP with ID ${rfpId} not found`);
    }

    const proposals = await this.proposalModel.findAll({
      where: { rfpId },
      include: [
        { model: Vendor, as: 'vendor' },
        { model: ProposalItem, as: 'items' },
      ],
    });

    if (proposals.length === 0) {
      return {
        rfp: {
          id: rfp.id,
          title: rfp.title,
          budget: rfp.budget,
          deliveryDays: rfp.deliveryDays,
        },
        proposals: [],
        comparison: {
          priceComparison: [],
          deliveryComparison: [],
          scoreComparison: [],
        },
      };
    }

    const priceComparison = this.buildPriceComparison(proposals, rfp.budget);
    const deliveryComparison = this.buildDeliveryComparison(proposals, rfp.deliveryDays);
    const scoreComparison = this.buildScoreComparison(proposals);

    return {
      rfp: {
        id: rfp.id,
        title: rfp.title,
        budget: rfp.budget,
        deliveryDays: rfp.deliveryDays,
      },
      proposals: proposals.map((p) => ({
        id: p.id,
        vendorName: p.vendor.companyName,
        vendorId: p.vendorId,
        totalPrice: p.totalPrice,
        deliveryDays: p.deliveryDays,
        score: p.aiScore,
        scoreBreakdown: p.aiScoreBreakdown,
        strengths: p.aiStrengths,
        weaknesses: p.aiWeaknesses,
        status: p.status,
      })),
      comparison: {
        priceComparison,
        deliveryComparison,
        scoreComparison,
      },
    };
  }

  async getAiRecommendation(
    rfpId: string,
    priorities?: string[],
  ): Promise<ComparisonResult['aiRecommendation']> {
    const rfp = await this.rfpModel.findByPk(rfpId, {
      include: [{ model: RfpItem, as: 'items' }],
    });

    if (!rfp) {
      throw new NotFoundException(`RFP with ID ${rfpId} not found`);
    }

    const proposals = await this.proposalModel.findAll({
      where: { rfpId },
      include: [
        { model: Vendor, as: 'vendor' },
        { model: ProposalItem, as: 'items' },
      ],
    });

    if (proposals.length === 0) {
      return {
        recommendedVendor: '',
        reasoning: 'No proposals received yet.',
        comparisonSummary: 'No proposals to compare.',
        rankings: [],
      };
    }

    const proposalData = proposals.map((p) => ({
      vendorName: p.vendor.companyName,
      proposal: {
        totalPrice: p.totalPrice,
        currency: p.currency || rfp.currency,
        deliveryDays: p.deliveryDays,
        paymentTerms: p.paymentTerms,
        warrantyTerms: p.warrantyTerms,
        items: p.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        summary: p.aiSummary || '',
        confidence: 100,
      } as ParsedProposal,
      evaluation: {
        overallScore: p.aiScore || 0,
        scoreBreakdown: p.aiScoreBreakdown || {
          priceScore: 0,
          deliveryScore: 0,
          termsScore: 0,
          completenessScore: 0,
          complianceScore: 0,
        },
        strengths: p.aiStrengths || [],
        weaknesses: p.aiWeaknesses || [],
        recommendation: p.aiRecommendation || '',
      } as ProposalEvaluation,
    }));

    try {
      return await this.aiService.compareProposalsAndRecommend(
        proposalData,
        {
          title: rfp.title,
          budget: rfp.budget,
          items: rfp.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
          })),
          priorities,
        },
      );
    } catch (error) {
      this.logger.error('Failed to get AI recommendation:', error);
      throw error;
    }
  }

  async getFullComparison(rfpId: string, priorities?: string[]): Promise<ComparisonResult> {
    const comparison = await this.compareProposals(rfpId);

    if (comparison.proposals.length > 0) {
      try {
        comparison.aiRecommendation = await this.getAiRecommendation(rfpId, priorities);
      } catch (error) {
        this.logger.error('Failed to add AI recommendation:', error);
      }
    }

    return comparison;
  }

  private buildPriceComparison(
    proposals: Proposal[],
    budget?: number,
  ): ComparisonResult['comparison']['priceComparison'] {
    const sorted = [...proposals]
      .filter((p) => p.totalPrice != null)
      .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));

    return sorted.map((p, index) => ({
      vendorName: p.vendor.companyName,
      price: p.totalPrice,
      percentOfBudget: budget && p.totalPrice ? (p.totalPrice / budget) * 100 : undefined,
      ranking: index + 1,
    }));
  }

  private buildDeliveryComparison(
    proposals: Proposal[],
    requiredDays?: number,
  ): ComparisonResult['comparison']['deliveryComparison'] {
    const sorted = [...proposals]
      .filter((p) => p.deliveryDays != null)
      .sort((a, b) => (a.deliveryDays || 999) - (b.deliveryDays || 999));

    return sorted.map((p, index) => ({
      vendorName: p.vendor.companyName,
      days: p.deliveryDays,
      meetsRequirement: requiredDays
        ? (p.deliveryDays || 999) <= requiredDays
        : true,
      ranking: index + 1,
    }));
  }

  private buildScoreComparison(
    proposals: Proposal[],
  ): ComparisonResult['comparison']['scoreComparison'] {
    const sorted = [...proposals]
      .filter((p) => p.aiScore != null)
      .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

    return sorted.map((p, index) => ({
      vendorName: p.vendor.companyName,
      score: p.aiScore,
      ranking: index + 1,
    }));
  }
}
