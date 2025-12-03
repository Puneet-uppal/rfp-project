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
    // Check for existing non-deleted vendor with same email
    const existing = await this.vendorModel.findOne({
      where: { email: createVendorDto.email, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException('A vendor with this email already exists');
    }

    // Check if there's a soft-deleted vendor with the same email - reactivate it
    const deletedVendor = await this.vendorModel.findOne({
      where: { email: createVendorDto.email, isDeleted: true },
    });

    if (deletedVendor) {
      await deletedVendor.update({
        ...createVendorDto,
        isDeleted: false,
        isActive: true,
      });
      return deletedVendor;
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

    const where: any = {
      isDeleted: false, // Always exclude soft-deleted vendors
    };

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
    const vendor = await this.vendorModel.findOne({
      where: { id, isDeleted: false },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async findByEmail(email: string): Promise<Vendor | null> {
    return this.vendorModel.findOne({ 
      where: { email, isDeleted: false } 
    });
  }

  async findByIds(ids: string[]): Promise<Vendor[]> {
    return this.vendorModel.findAll({
      where: { id: { [Op.in]: ids }, isDeleted: false },
    });
  }

  async update(id: string, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    const vendor = await this.findOne(id);

    if (updateVendorDto.email && updateVendorDto.email !== vendor.email) {
      const existing = await this.vendorModel.findOne({
        where: { email: updateVendorDto.email, isDeleted: false },
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
    // Soft delete - set isDeleted to true instead of destroying
    await vendor.update({ isDeleted: true });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.vendorModel.findAll({
      attributes: ['category'],
      where: { 
        category: { [Op.ne]: null },
        isDeleted: false, // Exclude deleted vendors
      },
      group: ['category'],
    });

    return result.map((r) => r.category).filter(Boolean) as string[];
  }
}
