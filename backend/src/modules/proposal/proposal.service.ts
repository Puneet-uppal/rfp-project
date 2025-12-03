import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as pdfParse from 'pdf-parse';
import {
  Proposal,
  ProposalItem,
  ProposalStatus,
  Rfp,
  RfpItem,
  RfpVendor,
  RfpVendorStatus,
  Vendor,
  RfpStatus,
} from '../../database/models';
import { AiService, ParsedProposal } from '../ai/ai.service';
import { EmailService, EmailMessage } from '../email/email.service';

@Injectable()
export class ProposalService implements OnModuleInit {
  private readonly logger = new Logger(ProposalService.name);

  constructor(
    @InjectModel(Proposal)
    private proposalModel: typeof Proposal,
    @InjectModel(ProposalItem)
    private proposalItemModel: typeof ProposalItem,
    @InjectModel(Rfp)
    private rfpModel: typeof Rfp,
    @InjectModel(RfpVendor)
    private rfpVendorModel: typeof RfpVendor,
    @InjectModel(Vendor)
    private vendorModel: typeof Vendor,
    private aiService: AiService,
    private emailService: EmailService,
  ) {}

  onModuleInit() {
    this.emailService.on('email', async (email: EmailMessage) => {
      try {
        // Quick check: Only process if sender is a known vendor (not deleted)
        const senderEmail = this.extractEmailAddress(email.from);
        const vendor = await this.vendorModel.findOne({
          where: { email: senderEmail, isDeleted: false },
        });
        
        if (!vendor) {
          this.logger.log(`[PROPOSAL] Skipping email from unknown sender: ${senderEmail}`);
          return;
        }
        
        await this.processIncomingEmail(email);
      } catch (err) {
        this.logger.error('Failed to process incoming email:', err);
      }
    });
  }

  async processIncomingEmail(email: EmailMessage): Promise<Proposal | null> {
    this.logger.log(`========== PROCESSING INCOMING EMAIL ==========`);
    this.logger.log(`From: ${email.from}`);
    this.logger.log(`Subject: ${email.subject}`);
    this.logger.log(`Date: ${email.date}`);
    this.logger.log(`Attachments: ${email.attachments.length}`);

    const senderEmail = this.extractEmailAddress(email.from);
    this.logger.log(`Extracted sender email: ${senderEmail}`);
    
    const vendor = await this.vendorModel.findOne({
      where: { email: senderEmail, isDeleted: false },
    });

    if (!vendor) {
      this.logger.warn(`✗ No vendor found for email: ${senderEmail}`);
      this.logger.log(`========== EMAIL SKIPPED (Unknown Vendor) ==========`);
      return null;
    }

    this.logger.log(`✓ Found vendor: ${vendor.companyName} (ID: ${vendor.id})`);

    const rfpVendors = await this.rfpVendorModel.findAll({
      where: {
        vendorId: vendor.id,
        status: RfpVendorStatus.SENT,
      },
      include: [{ model: Rfp, as: 'rfp', include: [{ model: RfpItem, as: 'items' }] }],
      order: [['sentAt', 'DESC']],
    });

    if (rfpVendors.length === 0) {
      this.logger.warn(`✗ No sent RFPs found for vendor: ${vendor.companyName}`);
      this.logger.log(`========== EMAIL SKIPPED (No Pending RFPs) ==========`);
      return null;
    }

    this.logger.log(`✓ Found ${rfpVendors.length} pending RFP(s) for this vendor`);

    const rfpVendor = rfpVendors[0];
    const rfp = rfpVendor.rfp;
    this.logger.log(`✓ Matching to RFP: "${rfp.title}" (ID: ${rfp.id})`);
    this.logger.log(`  - RFP was sent at: ${rfpVendor.sentAt}`);
    this.logger.log(`  - Items in RFP: ${rfp.items.length}`);

    let proposal = await this.proposalModel.findOne({
      where: { rfpId: rfp.id, vendorId: vendor.id },
    });

    const attachmentContents: string[] = [];
    const attachmentInfo: Proposal['attachments'] = [];

    this.logger.log(`---------- Processing ${email.attachments.length} Attachment(s) ----------`);
    for (const attachment of email.attachments) {
      this.logger.log(`  Processing: ${attachment.filename} (${attachment.contentType}, ${attachment.size} bytes)`);
      try {
        let content = '';

        if (attachment.contentType === 'application/pdf') {
          this.logger.log(`    → Parsing PDF...`);
          const pdfData = await pdfParse(attachment.content);
          content = pdfData.text;
          this.logger.log(`    ✓ Extracted ${content.length} characters from PDF`);
        } else if (
          attachment.contentType.startsWith('text/') ||
          attachment.filename.endsWith('.txt') ||
          attachment.filename.endsWith('.csv')
        ) {
          content = attachment.content.toString('utf-8');
          this.logger.log(`    ✓ Read ${content.length} characters from text file`);
        } else {
          this.logger.log(`    → Skipped (unsupported type)`);
        }

        if (content) {
          attachmentContents.push(`File: ${attachment.filename}\n${content}`);
        }

        attachmentInfo.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
          parsedContent: content || undefined,
        });
      } catch (err) {
        this.logger.error(`    ✗ Failed to parse attachment ${attachment.filename}:`, err);
        attachmentInfo.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size,
        });
      }
    }

    this.logger.log(`---------- Creating/Updating Proposal ----------`);
    if (!proposal) {
      this.logger.log(`Creating new proposal...`);
      proposal = await this.proposalModel.create({
        rfpId: rfp.id,
        vendorId: vendor.id,
        status: ProposalStatus.PARSING,
        rawEmailBody: email.body,
        emailSubject: email.subject,
        emailReceivedAt: email.date,
        emailMessageId: email.messageId,
        attachments: attachmentInfo,
      });
      this.logger.log(`✓ New proposal created with ID: ${proposal.id}`);
    } else {
      this.logger.log(`Updating existing proposal ID: ${proposal.id}`);
      await proposal.update({
        status: ProposalStatus.PARSING,
        rawEmailBody: email.body,
        emailSubject: email.subject,
        emailReceivedAt: email.date,
        emailMessageId: email.messageId,
        attachments: attachmentInfo,
      });
      this.logger.log(`✓ Proposal updated`);
    }

    this.logger.log(`Updating vendor status to RESPONDED...`);
    await rfpVendor.update({
      status: RfpVendorStatus.RESPONDED,
      respondedAt: new Date(),
    });
    this.logger.log(`✓ Vendor status updated to RESPONDED`);

    if (rfp.status === RfpStatus.SENT) {
      this.logger.log(`Updating RFP status to EVALUATING...`);
      await rfp.update({ status: RfpStatus.EVALUATING });
      this.logger.log(`✓ RFP status updated to EVALUATING`);
    }

    this.logger.log(`---------- AI Parsing Proposal ----------`);
    try {
      this.logger.log(`Sending to AI for parsing...`);
      const parsedData = await this.aiService.parseVendorResponse(
        email.body,
        attachmentContents,
        {
          title: rfp.title,
          items: rfp.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            specifications: i.specifications,
          })),
          budget: rfp.budget,
        },
      );

      this.logger.log(`✓ AI parsed proposal data:`);
      this.logger.log(`  - Total Price: ${parsedData.totalPrice || 'Not specified'}`);
      this.logger.log(`  - Delivery Days: ${parsedData.deliveryDays || 'Not specified'}`);
      this.logger.log(`  - Items: ${parsedData.items?.length || 0}`);
      this.logger.log(`  - Confidence: ${parsedData.confidence}%`);

      await this.applyParsedData(proposal, parsedData, rfp);
      this.logger.log(`✓ Parsed data applied to proposal`);
    } catch (err) {
      this.logger.error('✗ Failed to parse proposal with AI:', err);
      await proposal.update({ status: ProposalStatus.PARSE_FAILED });
    }

    this.logger.log(`========== EMAIL PROCESSING COMPLETE ==========`);
    this.logger.log(`Proposal ID: ${proposal.id}`);
    this.logger.log(`Status: ${proposal.status}`);
    
    return proposal;
  }

  private async applyParsedData(
    proposal: Proposal,
    parsedData: ParsedProposal,
    rfp: Rfp,
  ): Promise<void> {
    await proposal.update({
      totalPrice: parsedData.totalPrice,
      currency: parsedData.currency || rfp.currency,
      deliveryDays: parsedData.deliveryDays,
      paymentTerms: parsedData.paymentTerms,
      warrantyTerms: parsedData.warrantyTerms,
      validityPeriod: parsedData.validityPeriod,
      additionalTerms: parsedData.additionalTerms,
      aiSummary: parsedData.summary,
      aiExtractedData: parsedData as any,
      status: ProposalStatus.PARSED,
    });

    if (parsedData.items?.length) {
      this.logger.log(`  Creating ${parsedData.items.length} proposal item(s)...`);
      await this.proposalItemModel.destroy({ where: { proposalId: proposal.id } });

      await this.proposalItemModel.bulkCreate(
        parsedData.items.map((item) => ({
          proposalId: proposal.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          currency: proposal.currency,
          specifications: item.specifications,
        })),
      );
      this.logger.log(`  ✓ Proposal items created`);
    }

    this.logger.log(`---------- AI Evaluating Proposal ----------`);
    try {
      this.logger.log(`Sending to AI for evaluation...`);
      const evaluation = await this.aiService.evaluateProposal(parsedData, {
        title: rfp.title,
        budget: rfp.budget,
        deliveryDays: rfp.deliveryDays,
        paymentTerms: rfp.paymentTerms,
        warrantyTerms: rfp.warrantyTerms,
        items: rfp.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          specifications: i.specifications,
        })),
      });

      this.logger.log(`✓ AI Evaluation Results:`);
      this.logger.log(`  📊 Overall Score: ${evaluation.overallScore}/100`);
      this.logger.log(`  📈 Score Breakdown:`);
      this.logger.log(`     - Price Score: ${evaluation.scoreBreakdown.priceScore}`);
      this.logger.log(`     - Delivery Score: ${evaluation.scoreBreakdown.deliveryScore}`);
      this.logger.log(`     - Terms Score: ${evaluation.scoreBreakdown.termsScore}`);
      this.logger.log(`     - Completeness: ${evaluation.scoreBreakdown.completenessScore}`);
      this.logger.log(`     - Compliance: ${evaluation.scoreBreakdown.complianceScore}`);
      this.logger.log(`  ✅ Strengths: ${evaluation.strengths.join(', ')}`);
      this.logger.log(`  ⚠️  Weaknesses: ${evaluation.weaknesses.join(', ')}`);
      this.logger.log(`  💡 Recommendation: ${evaluation.recommendation}`);

      await proposal.update({
        aiScore: evaluation.overallScore,
        aiScoreBreakdown: evaluation.scoreBreakdown,
        aiStrengths: evaluation.strengths,
        aiWeaknesses: evaluation.weaknesses,
        aiRecommendation: evaluation.recommendation,
        status: ProposalStatus.EVALUATED,
      });
      this.logger.log(`✓ Proposal status updated to EVALUATED`);
    } catch (err) {
      this.logger.error('✗ Failed to evaluate proposal:', err);
    }
  }

  async createManualProposal(
    rfpId: string,
    vendorId: string,
    data: {
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
  ): Promise<Proposal> {
    const rfp = await this.rfpModel.findByPk(rfpId, {
      include: [{ model: RfpItem, as: 'items' }],
    });

    if (!rfp) {
      throw new NotFoundException(`RFP with ID ${rfpId} not found`);
    }

    const vendor = await this.vendorModel.findByPk(vendorId);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${vendorId} not found`);
    }

    let proposal = await this.proposalModel.findOne({
      where: { rfpId, vendorId },
    });

    if (!proposal) {
      proposal = await this.proposalModel.create({
        rfpId,
        vendorId,
        totalPrice: data.totalPrice,
        currency: data.currency || rfp.currency,
        deliveryDays: data.deliveryDays,
        paymentTerms: data.paymentTerms,
        warrantyTerms: data.warrantyTerms,
        rawEmailBody: data.rawContent,
        status: ProposalStatus.PARSED,
      });
    } else {
      await proposal.update({
        totalPrice: data.totalPrice,
        currency: data.currency || rfp.currency,
        deliveryDays: data.deliveryDays,
        paymentTerms: data.paymentTerms,
        warrantyTerms: data.warrantyTerms,
        rawEmailBody: data.rawContent,
        status: ProposalStatus.PARSED,
      });
    }

    if (data.items?.length) {
      await this.proposalItemModel.destroy({ where: { proposalId: proposal.id } });

      await this.proposalItemModel.bulkCreate(
        data.items.map((item) => ({
          proposalId: proposal.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice ? item.unitPrice * item.quantity : undefined,
          currency: proposal.currency,
          specifications: item.specifications,
        })),
      );
    }

    try {
      const parsedData: ParsedProposal = {
        totalPrice: proposal.totalPrice,
        currency: proposal.currency,
        deliveryDays: proposal.deliveryDays,
        paymentTerms: proposal.paymentTerms,
        warrantyTerms: proposal.warrantyTerms,
        items: data.items?.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.unitPrice ? i.unitPrice * i.quantity : undefined,
        })) || [],
        summary: '',
        confidence: 100,
      };

      const evaluation = await this.aiService.evaluateProposal(parsedData, {
        title: rfp.title,
        budget: rfp.budget,
        deliveryDays: rfp.deliveryDays,
        paymentTerms: rfp.paymentTerms,
        warrantyTerms: rfp.warrantyTerms,
        items: rfp.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          specifications: i.specifications,
        })),
      });

      await proposal.update({
        aiScore: evaluation.overallScore,
        aiScoreBreakdown: evaluation.scoreBreakdown,
        aiStrengths: evaluation.strengths,
        aiWeaknesses: evaluation.weaknesses,
        aiRecommendation: evaluation.recommendation,
        status: ProposalStatus.EVALUATED,
      });
    } catch (err) {
      this.logger.error('Failed to evaluate manual proposal:', err);
    }

    return this.findOne(proposal.id);
  }

  async findByRfp(rfpId: string): Promise<Proposal[]> {
    return this.proposalModel.findAll({
      where: { rfpId },
      include: [
        { model: Vendor, as: 'vendor' },
        { model: ProposalItem, as: 'items' },
      ],
      order: [['aiScore', 'DESC']],
    });
  }

  async findOne(id: string): Promise<Proposal> {
    const proposal = await this.proposalModel.findByPk(id, {
      include: [
        { model: Vendor, as: 'vendor' },
        { model: ProposalItem, as: 'items' },
        { model: Rfp, as: 'rfp' },
      ],
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${id} not found`);
    }

    return proposal;
  }

  async reparse(id: string): Promise<Proposal> {
    const proposal = await this.findOne(id);
    const rfp = await this.rfpModel.findByPk(proposal.rfpId, {
      include: [{ model: RfpItem, as: 'items' }],
    });

    if (!rfp) {
      throw new NotFoundException('RFP not found');
    }

    if (!proposal.rawEmailBody) {
      throw new Error('No raw email content to parse');
    }

    await proposal.update({ status: ProposalStatus.PARSING });

    const attachmentContents =
      proposal.attachments
        ?.filter((a) => a.parsedContent)
        .map((a) => `File: ${a.filename}\n${a.parsedContent}`) || [];

    try {
      const parsedData = await this.aiService.parseVendorResponse(
        proposal.rawEmailBody,
        attachmentContents,
        {
          title: rfp.title,
          items: rfp.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            specifications: i.specifications,
          })),
          budget: rfp.budget,
        },
      );

      await this.applyParsedData(proposal, parsedData, rfp);
    } catch (err) {
      this.logger.error('Failed to re-parse proposal:', err);
      await proposal.update({ status: ProposalStatus.PARSE_FAILED });
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const proposal = await this.findOne(id);
    await proposal.destroy();
  }

  async selectWinner(proposalId: string): Promise<Proposal> {
    const proposal = await this.findOne(proposalId);

    await this.proposalModel.update(
      { status: ProposalStatus.REJECTED },
      { where: { rfpId: proposal.rfpId } },
    );

    await proposal.update({ status: ProposalStatus.SELECTED });

    await this.rfpModel.update(
      { status: RfpStatus.AWARDED },
      { where: { id: proposal.rfpId } },
    );

    return proposal;
  }

  private extractEmailAddress(fromString: string): string {
    const match = fromString.match(/<([^>]+)>/);
    return match ? match[1] : fromString;
  }
}
