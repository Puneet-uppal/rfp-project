import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Rfp } from './rfp.model';
import { Vendor } from './vendor.model';
import { ProposalItem } from './proposal-item.model';

export enum ProposalStatus {
  RECEIVED = 'received',
  PARSING = 'parsing',
  PARSED = 'parsed',
  PARSE_FAILED = 'parse_failed',
  EVALUATED = 'evaluated',
  SELECTED = 'selected',
  REJECTED = 'rejected',
}

@Table({ tableName: 'proposals', timestamps: true })
export class Proposal extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Rfp)
  @Column({ type: DataType.UUID, allowNull: false })
  rfpId: string;

  @BelongsTo(() => Rfp, { onDelete: 'CASCADE' })
  rfp: Rfp;

  @ForeignKey(() => Vendor)
  @Column({ type: DataType.UUID, allowNull: false })
  vendorId: string;

  @BelongsTo(() => Vendor)
  vendor: Vendor;

  @Default(ProposalStatus.RECEIVED)
  @Column({ type: DataType.ENUM(...Object.values(ProposalStatus)) })
  status: ProposalStatus;

  // Raw email data
  @Column({ type: DataType.TEXT, allowNull: true })
  rawEmailBody?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  emailSubject?: string;

  @Column({ type: DataType.DATE, allowNull: true })
  emailReceivedAt?: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  emailMessageId?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    parsedContent?: string;
  }>;

  // AI Parsed structured data
  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  totalPrice?: number;

  @Column({ type: DataType.STRING(100), allowNull: true })
  currency?: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  deliveryDays?: number;

  @Column({ type: DataType.STRING(255), allowNull: true })
  paymentTerms?: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  warrantyTerms?: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  validityPeriod?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  additionalTerms?: Record<string, any>;

  // AI Analysis
  @Column({ type: DataType.TEXT, allowNull: true })
  aiSummary?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  aiExtractedData?: Record<string, any>;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: true })
  aiScore?: number;

  @Column({ type: DataType.JSONB, allowNull: true })
  aiScoreBreakdown?: {
    priceScore?: number;
    deliveryScore?: number;
    termsScore?: number;
    completenessScore?: number;
    complianceScore?: number;
  };

  @Column({ type: DataType.TEXT, allowNull: true })
  aiRecommendation?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  aiStrengths?: string[];

  @Column({ type: DataType.JSONB, allowNull: true })
  aiWeaknesses?: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => ProposalItem)
  items: ProposalItem[];
}

