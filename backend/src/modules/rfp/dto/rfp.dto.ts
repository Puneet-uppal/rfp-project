import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsObject,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RfpStatus } from '../../../database/models';

export class RfpItemDto {
  @ApiProperty({ description: 'Item name', example: 'Laptop' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quantity', example: 20 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Unit', example: 'units' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional({ description: 'Specifications', example: { ram: '16GB', storage: '512GB SSD' } })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
}

export class CreateRfpFromNaturalLanguageDto {
  @ApiProperty({
    description: 'Natural language description of procurement needs',
    example: 'I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch.',
  })
  @IsString()
  input: string;
}

export class CreateRfpDto {
  @ApiProperty({ description: 'RFP title', example: 'IT Equipment Procurement Q1 2024' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'RFP description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Original natural language input' })
  @IsOptional()
  @IsString()
  originalInput?: string;

  @ApiPropertyOptional({ description: 'Total budget', example: 50000 })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: 'Deadline date', example: '2024-03-15' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Delivery days', example: 30 })
  @IsOptional()
  @IsNumber()
  deliveryDays?: number;

  @ApiPropertyOptional({ description: 'Payment terms', example: 'Net 30' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Warranty terms', example: '1 year minimum' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  warrantyTerms?: string;

  @ApiPropertyOptional({ description: 'Additional requirements' })
  @IsOptional()
  @IsObject()
  additionalRequirements?: Record<string, any>;

  @ApiProperty({ description: 'RFP items', type: [RfpItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfpItemDto)
  items: RfpItemDto[];
}

export class UpdateRfpDto {
  @ApiPropertyOptional({ description: 'RFP title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'RFP description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Total budget' })
  @IsOptional()
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ description: 'Deadline date' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Delivery days' })
  @IsOptional()
  @IsNumber()
  deliveryDays?: number;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Warranty terms' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  warrantyTerms?: string;

  @ApiPropertyOptional({ description: 'Additional requirements' })
  @IsOptional()
  @IsObject()
  additionalRequirements?: Record<string, any>;

  @ApiPropertyOptional({ description: 'RFP status', enum: RfpStatus })
  @IsOptional()
  @IsEnum(RfpStatus)
  status?: RfpStatus;

  @ApiPropertyOptional({ description: 'RFP items', type: [RfpItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfpItemDto)
  items?: RfpItemDto[];
}

export class SendRfpToVendorsDto {
  @ApiProperty({ description: 'Vendor IDs to send RFP to', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  vendorIds: string[];

  @ApiPropertyOptional({ description: 'Custom email subject' })
  @IsOptional()
  @IsString()
  customSubject?: string;

  @ApiPropertyOptional({ description: 'Custom email body' })
  @IsOptional()
  @IsString()
  customBody?: string;
}

export class RfpResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  originalInput?: string;

  @ApiPropertyOptional()
  budget?: number;

  @ApiPropertyOptional()
  deadline?: Date;

  @ApiPropertyOptional()
  deliveryDays?: number;

  @ApiPropertyOptional()
  paymentTerms?: string;

  @ApiPropertyOptional()
  warrantyTerms?: string;

  @ApiPropertyOptional()
  additionalRequirements?: Record<string, any>;

  @ApiProperty({ enum: RfpStatus })
  status: RfpStatus;

  @ApiPropertyOptional()
  aiSummary?: string;

  @ApiProperty()
  items: RfpItemDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

