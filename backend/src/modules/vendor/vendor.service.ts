import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Vendor } from '../../database/models';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';

@Injectable()
export class VendorService {
  constructor(
    @InjectModel(Vendor)
    private vendorModel: typeof Vendor,
  ) {}

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    const existing = await this.vendorModel.findOne({
      where: { email: createVendorDto.email },
    });

    if (existing) {
      throw new ConflictException('A vendor with this email already exists');
    }

    return this.vendorModel.create(createVendorDto as any);
  }

  async findAll(options?: {
    search?: string;
    category?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ vendors: Vendor[]; total: number }> {
    const { search, category, isActive, page = 1, limit = 20 } = options || {};

    const where: any = {};

    if (search) {
      where[Op.or] = [
        { companyName: { [Op.iLike]: `%${search}%` } },
        { contactPerson: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const { rows: vendors, count: total } = await this.vendorModel.findAndCountAll({
      where,
      order: [['companyName', 'ASC']],
      offset: (page - 1) * limit,
      limit,
    });

    return { vendors, total };
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorModel.findByPk(id);

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async findByEmail(email: string): Promise<Vendor | null> {
    return this.vendorModel.findOne({ where: { email } });
  }

  async findByIds(ids: string[]): Promise<Vendor[]> {
    return this.vendorModel.findAll({
      where: { id: { [Op.in]: ids } },
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    if (updateVendorDto.email && updateVendorDto.email !== vendor.email) {
      const existing = await this.vendorModel.findOne({
        where: { email: updateVendorDto.email },
      });

      if (existing) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    await vendor.update(updateVendorDto);
    return vendor;
  }

  async remove(id: string): Promise<void> {
    const vendor = await this.findOne(id);
    await vendor.destroy();
  }

  async getCategories(): Promise<string[]> {
    const result = await this.vendorModel.findAll({
      attributes: ['category'],
      where: { category: { [Op.ne]: null } },
      group: ['category'],
    });

    return result.map((r) => r.category).filter(Boolean) as string[];
  }
}
