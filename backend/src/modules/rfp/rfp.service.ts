import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Rfp, RfpItem, RfpVendor, Vendor, RfpStatus, RfpVendorStatus } from '../../database/models';
import { CreateRfpDto, UpdateRfpDto, SendRfpToVendorsDto } from './dto/rfp.dto';
import { AiService } from '../ai/ai.service';
import { EmailService } from '../email/email.service';
import { VendorService } from '../vendor/vendor.service';

@Injectable()
export class RfpService {
  private readonly logger = new Logger(RfpService.name);

  constructor(
    @InjectModel(Rfp)
    private rfpModel: typeof Rfp,
    @InjectModel(RfpItem)
    private rfpItemModel: typeof RfpItem,
    @InjectModel(RfpVendor)
    private rfpVendorModel: typeof RfpVendor,
    private aiService: AiService,
    private emailService: EmailService,
    private vendorService: VendorService,
  ) {}

  async createFromNaturalLanguage(input: string): Promise<Rfp> {
    this.logger.log('Parsing natural language input to structured RFP');

    const parsedRfp = await this.aiService.parseNaturalLanguageToRfp(input);

    const rfp = await this.rfpModel.create({
      title: parsedRfp.title,
      description: parsedRfp.description,
      originalInput: input,
      budget: parsedRfp.budget,
      deadline: parsedRfp.deadline ? new Date(parsedRfp.deadline) : undefined,
      deliveryDays: parsedRfp.deliveryDays,
      paymentTerms: parsedRfp.paymentTerms,
      warrantyTerms: parsedRfp.warrantyTerms,
      additionalRequirements: parsedRfp.additionalRequirements,
      aiSummary: parsedRfp.summary,
      status: RfpStatus.DRAFT,
    });

    if (parsedRfp.items?.length) {
      await this.rfpItemModel.bulkCreate(
        parsedRfp.items.map((item) => ({
          rfpId: rfp.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          specifications: item.specifications,
        })),
      );
    }

    return this.findOne(rfp.id);
  }

  async create(createRfpDto: CreateRfpDto): Promise<Rfp> {
    const rfp = await this.rfpModel.create({
      title: createRfpDto.title,
      description: createRfpDto.description,
      originalInput: createRfpDto.originalInput,
      budget: createRfpDto.budget,
      deadline: createRfpDto.deadline ? new Date(createRfpDto.deadline) : undefined,
      deliveryDays: createRfpDto.deliveryDays,
      paymentTerms: createRfpDto.paymentTerms,
      warrantyTerms: createRfpDto.warrantyTerms,
      additionalRequirements: createRfpDto.additionalRequirements,
      status: RfpStatus.DRAFT,
    });

    if (createRfpDto.items?.length) {
      await this.rfpItemModel.bulkCreate(
        createRfpDto.items.map((item) => ({
          rfpId: rfp.id,
          ...item,
        })),
      );
    }

    return this.findOne(rfp.id);
  }

  async findAll(options?: {
    status?: RfpStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ rfps: Rfp[]; total: number }> {
    const { status, search, page = 1, limit = 20 } = options || {};

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: rfps, count: total } = await this.rfpModel.findAndCountAll({
      where,
      include: [
        { model: RfpItem, as: 'items' },
        { model: RfpVendor, as: 'rfpVendors', include: [{ model: Vendor, as: 'vendor' }] },
      ],
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * limit,
      limit,
    });

    return { rfps, total };
  }

  async findOne(id: string): Promise<Rfp> {
    const rfp = await this.rfpModel.findByPk(id, {
      include: [
        { model: RfpItem, as: 'items' },
        { model: RfpVendor, as: 'rfpVendors', include: [{ model: Vendor, as: 'vendor' }] },
      ],
    });

    if (!rfp) {
      throw new NotFoundException(`RFP with ID ${id} not found`);
    }

    return rfp;
  }

  async update(id: string, updateRfpDto: UpdateRfpDto): Promise<Rfp> {
    const rfp = await this.findOne(id);

    if (rfp.status !== RfpStatus.DRAFT && updateRfpDto.items) {
      throw new BadRequestException('Cannot modify items after RFP has been sent');
    }

    await rfp.update({
      ...updateRfpDto,
      deadline: updateRfpDto.deadline ? new Date(updateRfpDto.deadline) : rfp.deadline,
    });

    if (updateRfpDto.items) {
      await this.rfpItemModel.destroy({ where: { rfpId: id } });
      await this.rfpItemModel.bulkCreate(
        updateRfpDto.items.map((item) => ({
          rfpId: id,
          ...item,
        })),
      );
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const rfp = await this.findOne(id);

    if (rfp.status !== RfpStatus.DRAFT) {
      throw new BadRequestException('Cannot delete RFP that has already been sent');
    }

    await rfp.destroy();
  }

  async sendToVendors(id: string, sendDto: SendRfpToVendorsDto): Promise<{ sent: number; failed: number }> {
    this.logger.log(`========== SEND TO VENDORS START ==========`);
    this.logger.log(`RFP ID: ${id}`);
    this.logger.log(`Vendor IDs to send: ${JSON.stringify(sendDto.vendorIds)}`);
    
    const rfp = await this.findOne(id);
    this.logger.log(`RFP found: "${rfp.title}" (Status: ${rfp.status})`);

    if (rfp.status === RfpStatus.CLOSED || rfp.status === RfpStatus.AWARDED) {
      this.logger.warn(`Cannot send RFP - status is ${rfp.status}`);
      throw new BadRequestException('Cannot send a closed or awarded RFP');
    }

    const vendors = await this.vendorService.findByIds(sendDto.vendorIds);
    this.logger.log(`Found ${vendors.length} valid vendors out of ${sendDto.vendorIds.length} requested`);

    if (vendors.length === 0) {
      this.logger.warn('No valid vendors found');
      throw new BadRequestException('No valid vendors found');
    }

    let sent = 0;
    let failed = 0;

    for (const vendor of vendors) {
      this.logger.log(`---------- Processing vendor: ${vendor.companyName} (${vendor.email}) ----------`);
      
      try {
        let subject = sendDto.customSubject;
        let body = sendDto.customBody;

        if (!subject || !body) {
          this.logger.log(`Generating email content using AI for ${vendor.companyName}...`);
          const emailContent = await this.aiService.generateRfpEmail(
            {
              title: rfp.title,
              description: rfp.description,
              budget: rfp.budget,
              deadline: rfp.deadline?.toISOString().split('T')[0],
              deliveryDays: rfp.deliveryDays,
              paymentTerms: rfp.paymentTerms,
              warrantyTerms: rfp.warrantyTerms,
              items: rfp.items.map((i) => ({
                name: i.name,
                description: i.description,
                quantity: i.quantity,
                unit: i.unit,
                specifications: i.specifications,
              })),
              additionalRequirements: rfp.additionalRequirements,
              summary: rfp.aiSummary || '',
              currency: 'USD',
            },
            vendor.companyName,
          );
          subject = subject || emailContent.subject;
          body = body || emailContent.body;
          this.logger.log(`AI generated email subject: "${subject}"`);
        } else {
          this.logger.log(`Using custom email subject: "${subject}"`);
        }

        this.logger.log(`Sending email to ${vendor.email}...`);
        const result = await this.emailService.sendEmail({
          to: vendor.email,
          subject,
          text: body,
        });
        this.logger.log(`✓ Email sent successfully! Message ID: ${result.messageId}`);

        let rfpVendor = await this.rfpVendorModel.findOne({
          where: { rfpId: id, vendorId: vendor.id },
        });

        if (!rfpVendor) {
          this.logger.log(`Creating new RfpVendor record for vendor ${vendor.id}`);
          rfpVendor = await this.rfpVendorModel.create({
            rfpId: id,
            vendorId: vendor.id,
            status: RfpVendorStatus.SENT,
            sentAt: new Date(),
            emailMessageId: result.messageId,
          });
          this.logger.log(`✓ RfpVendor record created with ID: ${rfpVendor.id}`);
        } else {
          this.logger.log(`Updating existing RfpVendor record ${rfpVendor.id}`);
          await rfpVendor.update({
            status: RfpVendorStatus.SENT,
            sentAt: new Date(),
            emailMessageId: result.messageId,
          });
          this.logger.log(`✓ RfpVendor record updated - Status: SENT, SentAt: ${new Date().toISOString()}`);
        }

        sent++;
        this.logger.log(`✓ SUCCESS: RFP sent to ${vendor.companyName} (${vendor.email})`);
      } catch (error) {
        this.logger.error(`✗ FAILED to send RFP to ${vendor.companyName} (${vendor.email})`);
        this.logger.error(`Error details: ${error.message}`);
        this.logger.error(error.stack);
        failed++;
      }
    }

    if (sent > 0 && rfp.status === RfpStatus.DRAFT) {
      this.logger.log(`Updating RFP status from DRAFT to SENT`);
      await rfp.update({ status: RfpStatus.SENT });
      this.logger.log(`✓ RFP status updated to SENT`);
    }

    this.logger.log(`========== SEND TO VENDORS COMPLETE ==========`);
    this.logger.log(`Results: ${sent} sent, ${failed} failed`);
    
    return { sent, failed };
  }

  async getRfpVendors(id: string): Promise<RfpVendor[]> {
    const rfp = await this.findOne(id);
    return rfp.rfpVendors;
  }

  async addVendorToRfp(rfpId: string, vendorId: string): Promise<RfpVendor> {
    await this.findOne(rfpId);
    await this.vendorService.findOne(vendorId);

    const existing = await this.rfpVendorModel.findOne({
      where: { rfpId, vendorId },
    });

    if (existing) {
      return existing;
    }

    return this.rfpVendorModel.create({
      rfpId,
      vendorId,
      status: RfpVendorStatus.PENDING,
    });
  }

  async removeVendorFromRfp(rfpId: string, vendorId: string): Promise<void> {
    await this.rfpVendorModel.destroy({
      where: { rfpId, vendorId },
    });
  }

  async updateStatus(id: string, status: RfpStatus): Promise<Rfp> {
    const rfp = await this.findOne(id);
    await rfp.update({ status });
    return rfp;
  }
}
