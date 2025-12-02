import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check email service status' })
  @ApiResponse({ status: 200, description: 'Email service configuration status' })
  getStatus() {
    return this.emailService.isConfigured();
  }

  @Post('fetch')
  @ApiOperation({ summary: 'Manually trigger email fetch from IMAP' })
  @ApiResponse({ status: 200, description: 'Emails fetched successfully' })
  async fetchEmails() {
    const emails = await this.emailService.fetchNewEmails();
    return {
      success: true,
      count: emails.length,
      emails: emails.map((e) => ({
        messageId: e.messageId,
        from: e.from,
        subject: e.subject,
        date: e.date,
        hasAttachments: e.attachments.length > 0,
      })),
    };
  }

  @Post('polling/start')
  @ApiOperation({ summary: 'Start IMAP polling for new emails' })
  async startPolling() {
    await this.emailService.startImapPolling();
    return { success: true, message: 'Polling started' };
  }

  @Post('polling/stop')
  @ApiOperation({ summary: 'Stop IMAP polling' })
  stopPolling() {
    this.emailService.stopImapPolling();
    return { success: true, message: 'Polling stopped' };
  }
}

