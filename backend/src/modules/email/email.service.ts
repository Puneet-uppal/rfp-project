import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { EventEmitter } from 'events';

export interface EmailMessage {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  date: Date;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  replyTo?: string;
  references?: string;
  inReplyTo?: string;
}

@Injectable()
export class EmailService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private imapConnection: Imap | null = null;
  private isImapConnected = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    super();
  }

  async onModuleInit() {
    await this.initializeSmtp();
    // IMAP polling starts automatically on server start
    this.startImapPolling();
  }

  private async initializeSmtp() {
    const smtpConfig = this.configService.get('email.smtp');
    
    this.logger.log('========== SMTP CONFIGURATION ==========');
    this.logger.log(`SMTP Host: ${smtpConfig?.host}`);
    this.logger.log(`SMTP Port: ${smtpConfig?.port}`);
    this.logger.log(`SMTP Secure: ${smtpConfig?.secure}`);
    this.logger.log(`SMTP User: ${smtpConfig?.user}`);
    this.logger.log(`SMTP Password: ${smtpConfig?.password ? '***' + smtpConfig.password.slice(-4) : 'NOT SET'}`);
    this.logger.log('=========================================');
    
    if (!smtpConfig?.user || !smtpConfig?.password) {
      this.logger.warn('SMTP credentials not configured');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    try {
      await this.transporter.verify();
      this.logger.log('✓ SMTP connection verified successfully!');
    } catch (error) {
      this.logger.error('✗ SMTP verification failed:', error.message);
    }
  }

  /**
   * Send an email
   */
  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string; success: boolean }> {
    this.logger.log(`[EMAIL] Preparing to send email...`);
    this.logger.log(`[EMAIL] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    this.logger.log(`[EMAIL] Subject: ${options.subject}`);
    
    if (!this.transporter) {
      this.logger.error('[EMAIL] SMTP transporter not configured!');
      throw new Error('SMTP not configured');
    }

    const fromConfig = this.configService.get('email.from');
    this.logger.log(`[EMAIL] From: "${fromConfig?.name}" <${fromConfig?.email}>`);
    
    try {
      const mailOptions = {
        from: `"${fromConfig.name}" <${fromConfig.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        replyTo: options.replyTo,
        references: options.references,
        inReplyTo: options.inReplyTo,
      };

      this.logger.log(`[EMAIL] Sending via SMTP...`);
      const result = await this.transporter.sendMail(mailOptions);

      this.logger.log(`[EMAIL] ✓ Email sent successfully!`);
      this.logger.log(`[EMAIL] Message ID: ${result.messageId}`);
      this.logger.log(`[EMAIL] Response: ${result.response}`);
      this.logger.log(`[EMAIL] Accepted: ${JSON.stringify(result.accepted)}`);
      this.logger.log(`[EMAIL] Rejected: ${JSON.stringify(result.rejected)}`);
      
      return { messageId: result.messageId, success: true };
    } catch (error) {
      this.logger.error(`[EMAIL] ✗ Failed to send email!`);
      this.logger.error(`[EMAIL] Error: ${error.message}`);
      this.logger.error(`[EMAIL] Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Start polling IMAP for new emails
   */
  async startImapPolling(intervalMs: number = 60000) {
    const imapConfig = this.configService.get('email.imap');
    
    this.logger.log('========== STARTING IMAP POLLING ==========');
    this.logger.log(`IMAP Host: ${imapConfig?.host}`);
    this.logger.log(`IMAP Port: ${imapConfig?.port}`);
    this.logger.log(`IMAP User: ${imapConfig?.user}`);
    this.logger.log(`IMAP TLS: ${imapConfig?.tls}`);
    this.logger.log(`Poll Interval: ${intervalMs}ms (${intervalMs / 1000}s)`);
    
    if (!imapConfig?.user || !imapConfig?.password) {
      this.logger.warn('✗ IMAP credentials not configured - polling cannot start');
      return;
    }

    // Initial fetch
    this.logger.log('Performing initial email fetch...');
    await this.fetchNewEmails();

    // Set up polling
    this.pollingInterval = setInterval(async () => {
      this.logger.log('[POLL] Checking for new emails...');
      await this.fetchNewEmails();
    }, intervalMs);

    this.logger.log(`✓ IMAP polling started successfully!`);
    this.logger.log('==========================================');
  }

  /**
   * Stop IMAP polling
   */
  stopImapPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.log('IMAP polling stopped');
    }
  }

  /**
   * Fetch new emails from IMAP - Only RFP-related emails
   */
  async fetchNewEmails(): Promise<EmailMessage[]> {
    const imapConfig = this.configService.get('email.imap');
    
    if (!imapConfig?.user || !imapConfig?.password) {
      this.logger.error('[IMAP] Not configured - cannot fetch emails');
      throw new Error('IMAP not configured');
    }

    this.logger.log('[IMAP] Connecting to mail server...');

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: imapConfig.user,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.tls,
        tlsOptions: { rejectUnauthorized: false },
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        this.logger.log('[IMAP] ✓ Connected successfully');
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            this.logger.error('[IMAP] ✗ Failed to open INBOX:', err.message);
            imap.end();
            reject(err);
            return;
          }

          this.logger.log(`[IMAP] ✓ Opened INBOX (${box.messages.total} total messages)`);

          // Calculate date for "since" filter - only fetch emails from last 24 hours
          const since = new Date();
          since.setDate(since.getDate() - 1);
          const sinceStr = since.toDateString();

          // Search for unseen emails that look like RFP replies (from last 24 hours)
          // Search criteria: UNSEEN + SINCE (last 24h) + Subject contains "RFP" or "Request for Proposal" or "RE:"
          imap.search([
            'UNSEEN',
            ['SINCE', sinceStr],
            ['OR', 
              ['OR', 
                ['SUBJECT', 'RFP'], 
                ['SUBJECT', 'Request for Proposal']
              ],
              ['SUBJECT', 'RE:']
            ]
          ], (searchErr, results) => {
            if (searchErr) {
              this.logger.error('[IMAP] ✗ Search failed:', searchErr.message);
              // Fallback to simpler search if complex search fails
              this.logger.log('[IMAP] Trying simpler search...');
              imap.search(['UNSEEN', ['SINCE', sinceStr]], (fallbackErr, fallbackResults) => {
                if (fallbackErr) {
                  imap.end();
                  reject(fallbackErr);
                  return;
                }
                this.processSearchResults(imap, fallbackResults || [], emails, resolve);
              });
              return;
            }

            this.processSearchResults(imap, results || [], emails, resolve);
          });
        });
      });

      imap.once('error', (imapErr: Error) => {
        this.logger.error('[IMAP] ✗ Connection error:', imapErr.message);
        reject(imapErr);
      });

      imap.connect();
    });
  }

  private processSearchResults(
    imap: Imap,
    results: number[],
    emails: EmailMessage[],
    resolve: (emails: EmailMessage[]) => void,
  ): void {
    if (!results || results.length === 0) {
      this.logger.log('[IMAP] No new RFP-related emails found');
      imap.end();
      resolve([]);
      return;
    }

    // Limit to max 10 emails per fetch to prevent overload
    const limitedResults = results.slice(0, 10);
    this.logger.log(`[IMAP] 📬 Found ${results.length} potential RFP email(s), processing ${limitedResults.length}`);

    const fetch = imap.fetch(limitedResults, { 
      bodies: '',
      markSeen: false, // Don't mark as seen until we verify it's from a vendor
    });

    fetch.on('message', (msg) => {
      msg.on('body', (stream) => {
        simpleParser(stream as any, (parseErr: Error | null, parsed: ParsedMail) => {
          if (parseErr) {
            this.logger.error('[IMAP] Failed to parse email:', parseErr);
            return;
          }

          const subject = parsed.subject || '';
          const from = parsed.from?.text || '';
          
          // Filter: Only process emails that look like RFP responses
          const isRfpRelated = 
            subject.toLowerCase().includes('rfp') ||
            subject.toLowerCase().includes('request for proposal') ||
            subject.toLowerCase().includes('proposal') ||
            subject.toLowerCase().includes('quotation') ||
            subject.toLowerCase().includes('quote') ||
            subject.startsWith('RE:') ||
            subject.startsWith('Re:');

          if (!isRfpRelated) {
            this.logger.log(`[IMAP] ⏭️  Skipping non-RFP email: "${subject.substring(0, 50)}..."`);
            return;
          }

          const email: EmailMessage = {
            messageId: parsed.messageId || '',
            from: from,
            to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to.text]) : [],
            subject: subject,
            body: parsed.text || '',
            htmlBody: parsed.html || undefined,
            date: parsed.date || new Date(),
            attachments: (parsed.attachments || []).map((att: Attachment) => ({
              filename: att.filename || 'unknown',
              contentType: att.contentType,
              size: att.size,
              content: att.content,
            })),
          };

          this.logger.log(`[IMAP] 📧 Found RFP-related email:`);
          this.logger.log(`       From: ${email.from}`);
          this.logger.log(`       Subject: ${email.subject}`);
          this.logger.log(`       Attachments: ${email.attachments.length}`);

          emails.push(email);
          this.emit('email', email);
        });
      });
    });

    fetch.once('error', (fetchErr) => {
      this.logger.error('[IMAP] Fetch error:', fetchErr);
    });

    fetch.once('end', () => {
      this.logger.log(`[IMAP] ✓ Finished processing ${emails.length} RFP-related email(s)`);
      imap.end();
      resolve(emails);
    });
  }

  /**
   * Process incoming email webhook (for services like SendGrid Inbound Parse)
   */
  async processWebhookEmail(webhookData: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      type: string;
      content: string; // base64 encoded
    }>;
  }): Promise<EmailMessage> {
    const email: EmailMessage = {
      messageId: `webhook-${Date.now()}`,
      from: webhookData.from,
      to: [webhookData.to],
      subject: webhookData.subject,
      body: webhookData.text,
      htmlBody: webhookData.html,
      date: new Date(),
      attachments: (webhookData.attachments || []).map((att) => ({
        filename: att.filename,
        contentType: att.type,
        size: Buffer.from(att.content, 'base64').length,
        content: Buffer.from(att.content, 'base64'),
      })),
    };

    this.emit('email', email);
    return email;
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): { smtp: boolean; imap: boolean } {
    const smtpConfig = this.configService.get('email.smtp');
    const imapConfig = this.configService.get('email.imap');

    return {
      smtp: !!(smtpConfig?.user && smtpConfig?.password),
      imap: !!(imapConfig?.user && imapConfig?.password),
    };
  }
}

