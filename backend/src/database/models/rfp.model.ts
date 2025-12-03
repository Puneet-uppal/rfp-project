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
} from 'sequelize-typescript';
import { RfpItem } from './rfp-item.model';
import { RfpVendor } from './rfp-vendor.model';
import { Proposal } from './proposal.model';

export enum RfpStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SENT = 'sent',
  EVALUATING = 'evaluating',
  AWARDED = 'deal_sold',
}

@Table({ tableName: 'rfps', timestamps: true })
export class Rfp extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  description: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  originalInput?: string;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  budget?: number;

  @Column({ type: DataType.STRING(10), allowNull: true })
  currency?: string;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  deadline?: Date;

  @Column({ type: DataType.INTEGER, allowNull: true })
  deliveryDays?: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  paymentTerms?: string;

  @Column({ type: DataType.STRING(100), allowNull: true })
  warrantyTerms?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  additionalRequirements?: Record<string, any>;

  @Default(RfpStatus.DRAFT)
  @Column({ type: DataType.ENUM(...Object.values(RfpStatus)) })
  status: RfpStatus;

  @Column({ type: DataType.TEXT, allowNull: true })
  aiSummary?: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => RfpItem)
  items: RfpItem[];

  @HasMany(() => RfpVendor)
  rfpVendors: RfpVendor[];

  @HasMany(() => Proposal)
  proposals: Proposal[];
}

