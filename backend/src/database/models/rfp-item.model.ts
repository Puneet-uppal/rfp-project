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
import { Rfp } from './rfp.model';

@Table({ tableName: 'rfp_items', timestamps: false })
export class RfpItem extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => Rfp)
  @Column({ type: DataType.UUID, allowNull: false })
  rfpId: string;

  @BelongsTo(() => Rfp, { onDelete: 'CASCADE' })
  rfp: Rfp;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  description?: string;

  @Default(1)
  @Column({ type: DataType.INTEGER, allowNull: false })
  quantity: number;

  @Column({ type: DataType.STRING(50), allowNull: true })
  unit?: string;

  @Column({ type: DataType.JSONB, allowNull: true })
  specifications?: Record<string, any>;
}

