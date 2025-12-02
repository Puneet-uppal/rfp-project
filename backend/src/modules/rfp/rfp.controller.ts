import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { RfpService } from './rfp.service';
import {
  CreateRfpDto,
  CreateRfpFromNaturalLanguageDto,
  UpdateRfpDto,
  SendRfpToVendorsDto,
  RfpResponseDto,
} from './dto/rfp.dto';
import { RfpStatus } from '../../database/models';

@ApiTags('RFPs')
@Controller('rfps')
export class RfpController {
  constructor(private readonly rfpService: RfpService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Create RFP from natural language input' })
  @ApiResponse({ status: 201, description: 'RFP created from natural language', type: RfpResponseDto })
  async createFromNaturalLanguage(@Body() dto: CreateRfpFromNaturalLanguageDto) {
    return this.rfpService.createFromNaturalLanguage(dto.input);
  }

  @Post()
  @ApiOperation({ summary: 'Create RFP from structured data' })
  @ApiResponse({ status: 201, description: 'RFP created', type: RfpResponseDto })
  async create(@Body() createRfpDto: CreateRfpDto) {
    return this.rfpService.create(createRfpDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all RFPs' })
  @ApiQuery({ name: 'status', required: false, enum: RfpStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of RFPs' })
  async findAll(
    @Query('status') status?: RfpStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rfpService.findAll({
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an RFP by ID' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'RFP details', type: RfpResponseDto })
  @ApiResponse({ status: 404, description: 'RFP not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rfpService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an RFP' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'RFP updated', type: RfpResponseDto })
  @ApiResponse({ status: 404, description: 'RFP not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRfpDto: UpdateRfpDto,
  ) {
    return this.rfpService.update(id, updateRfpDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an RFP' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 204, description: 'RFP deleted' })
  @ApiResponse({ status: 404, description: 'RFP not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rfpService.remove(id);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send RFP to vendors via email' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'RFP sent to vendors' })
  async sendToVendors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() sendDto: SendRfpToVendorsDto,
  ) {
    return this.rfpService.sendToVendors(id, sendDto);
  }

  @Get(':id/vendors')
  @ApiOperation({ summary: 'Get vendors assigned to an RFP' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'List of vendors for the RFP' })
  async getRfpVendors(@Param('id', ParseUUIDPipe) id: string) {
    return this.rfpService.getRfpVendors(id);
  }

  @Post(':id/vendors/:vendorId')
  @ApiOperation({ summary: 'Add a vendor to an RFP' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 201, description: 'Vendor added to RFP' })
  async addVendor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ) {
    return this.rfpService.addVendorToRfp(id, vendorId);
  }

  @Delete(':id/vendors/:vendorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a vendor from an RFP' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  @ApiResponse({ status: 204, description: 'Vendor removed from RFP' })
  async removeVendor(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ) {
    return this.rfpService.removeVendorFromRfp(id, vendorId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update RFP status' })
  @ApiParam({ name: 'id', description: 'RFP ID' })
  @ApiResponse({ status: 200, description: 'RFP status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: RfpStatus,
  ) {
    return this.rfpService.updateStatus(id, status);
  }
}

