import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  CreatedAt,
  UpdatedAt,
  HasMany,
  Unique,
} from 'sequelize-typescript';
import { RfpVendor } from './rfp-vendor.model';
import { Proposal } from './proposal.model';

@Table({ tableName: 'vendors', timestamps: true })
export class Vendor extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  companyName: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  contactPerson: string;

  @Unique
  @Column({ type: DataType.STRING(255), allowNull: false })
  email: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  phone?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  address?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  category?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @Default(true)
  @Column({ type: DataType.BOOLEAN })
  isActive: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => RfpVendor)
  rfpVendors: RfpVendor[];

  @HasMany(() => Proposal)
  proposals: Proposal[];
}

