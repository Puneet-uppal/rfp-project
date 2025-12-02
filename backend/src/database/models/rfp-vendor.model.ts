import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
  CreatedAt,
} from 'sequelize-typescript';
import { Rfp } from './rfp.model';
import { Vendor } from './vendor.model';

export enum RfpVendorStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  RESPONDED = 'responded',
  DECLINED = 'declined',
}

@Table({ tableName: 'rfp_vendors', timestamps: true, updatedAt: false })
export class RfpVendor extends Model {
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

  @BelongsTo(() => Vendor, { onDelete: 'CASCADE' })
  vendor: Vendor;

  @Default(RfpVendorStatus.PENDING)
  @Column({ type: DataType.ENUM(...Object.values(RfpVendorStatus)) })
  status: RfpVendorStatus;

  @Column({ type: DataType.DATE, allowNull: true })
  sentAt?: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  respondedAt?: Date;

  @Column({ type: DataType.TEXT, allowNull: true })
  emailMessageId?: string;

  @CreatedAt
  createdAt: Date;
}

