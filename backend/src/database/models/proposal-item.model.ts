import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Proposal } from './proposal.model';

@Table({ tableName: 'proposal_items', timestamps: false })
export class ProposalItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Proposal)
  @Column({ type: DataType.UUID, allowNull: false })
  proposalId: string;

  @BelongsTo(() => Proposal, { onDelete: 'CASCADE' })
  proposal: Proposal;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Default(1)
  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  unitPrice?: number;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true })
  totalPrice?: number;

  @Column({ type: DataType.STRING(50), allowNull: true })
  currency?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  specifications?: Record<string, any>;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes?: string;

  @Column({ type: DataType.UUID, allowNull: true })
  rfpItemId?: string;
}

