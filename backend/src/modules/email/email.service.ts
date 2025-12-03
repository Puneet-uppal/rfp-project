import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import { EventEmitter } from 'events';
import { DEFAULTS } from '../../config';

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
    try {
      await this.initializeSmtp();
    } catch (error) {
      this.logger.error('Failed to initialize SMTP:', error.message);
      // Don't throw - allow app to continue without email
    }
    
    // IMAP polling starts automatically on server start (wrapped in try-catch)
    try {
      this.startImapPolling();
    } catch (error) {
      this.logger.error('Failed to start IMAP polling:', error.message);
      // Don't throw - allow app to continue without IMAP
    }
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

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
        connectionTimeout: DEFAULTS.SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: DEFAULTS.SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: DEFAULTS.SMTP_SOCKET_TIMEOUT_MS,
      });

      await this.transporter.verify();
      this.logger.log('✓ SMTP connection verified successfully!');
    } catch (error) {
      this.logger.error('✗ SMTP verification failed:', error.message);
      // Don't throw - transporter might still work for sending
    }
  }

  /**
   * Send an email with retry logic
   */
  async sendEmail(options: SendEmailOptions, maxRetries = DEFAULTS.EMAIL_SEND_MAX_RETRIES): Promise<{ messageId: string; success: boolean }> {
    this.logger.log(`[EMAIL] Preparing to send email...`);
    this.logger.log(`[EMAIL] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    this.logger.log(`[EMAIL] Subject: ${options.subject}`);
    
    if (!this.transporter) {
      this.logger.error('[EMAIL] SMTP transporter not configured!');
      throw new Error('Email service is not configured. Please contact support.');
    }

    const fromConfig = this.configService.get('email.from');
    if (!fromConfig?.email) {
      throw new Error('Email sender not configured. Please contact support.');
    }
    
    this.logger.log(`[EMAIL] From: "${fromConfig?.name}" <${fromConfig?.email}>`);
    
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

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.logger.log(`[EMAIL] Sending via SMTP (attempt ${attempt + 1}/${maxRetries})...`);
        const result = await this.transporter.sendMail(mailOptions);

        this.logger.log(`[EMAIL] ✓ Email sent successfully!`);
        this.logger.log(`[EMAIL] Message ID: ${result.messageId}`);
        this.logger.log(`[EMAIL] Response: ${result.response}`);
        this.logger.log(`[EMAIL] Accepted: ${JSON.stringify(result.accepted)}`);
        this.logger.log(`[EMAIL] Rejected: ${JSON.stringify(result.rejected)}`);
        
        return { messageId: result.messageId, success: true };
      } catch (error) {
        lastError = error;
        this.logger.error(`[EMAIL] ✗ Attempt ${attempt + 1} failed: ${error.message}`);
        
        // Check if error is retryable
        const isRetryable = 
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('socket hang up') ||
          error.code === 'ESOCKET';
        
        if (isRetryable && attempt < maxRetries - 1) {
          const waitTime = (attempt + 1) * 2000; // 2s, 4s, 6s
          this.logger.log(`[EMAIL] Retrying in ${waitTime / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (!isRetryable) {
          // Non-retryable error - throw immediately
          break;
        }
      }
    }
    
    this.logger.error(`[EMAIL] ✗ Failed to send email after ${maxRetries} attempts`);
    
    // Provide user-friendly error messages
    const errorMessage = lastError?.message || '';
    if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication')) {
      throw new Error('Email authentication failed. Please contact support.');
    } else if (errorMessage.includes('ECONNREFUSED')) {
      throw new Error('Unable to connect to email server. Please try again later.');
    } else if (errorMessage.includes('ETIMEDOUT')) {
      throw new Error('Email server connection timed out. Please try again later.');
    }
    
    throw new Error('Failed to send email. Please try again later.');
  }

  /**
   * Start polling IMAP for new emails
   */
  async startImapPolling(intervalMs: number = DEFAULTS.IMAP_POLL_INTERVAL_MS) {
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

    // Initial fetch (wrapped in try-catch)
    this.logger.log('Performing initial email fetch...');
    try {
      await this.fetchNewEmails();
    } catch (error) {
      this.logger.error('[IMAP] Initial fetch failed:', error.message);
      // Continue anyway - polling will retry
    }

    // Set up polling with error handling
    this.pollingInterval = setInterval(async () => {
      try {
        this.logger.log('[POLL] Checking for new emails...');
        await this.fetchNewEmails();
      } catch (error) {
        this.logger.error('[POLL] Email fetch failed:', error.message);
        // Don't throw - let polling continue
      }
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

    // Add connection timeout
    const connectionTimeout = DEFAULTS.IMAP_CONNECTION_TIMEOUT_MS;
    
    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout;
      let isResolved = false;
      
      const cleanup = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      };
      
      const safeResolve = (value: EmailMessage[]) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(value);
        }
      };
      
      const safeReject = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          reject(error);
        }
      };
      
      // Set connection timeout
      timeoutHandle = setTimeout(() => {
        this.logger.error('[IMAP] Connection timeout');
        safeReject(new Error('IMAP connection timeout'));
      }, connectionTimeout);
      
      const imap = new Imap({
        user: imapConfig.user,
        password: imapConfig.password,
        host: imapConfig.host,
        port: imapConfig.port,
        tls: imapConfig.tls,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: DEFAULTS.IMAP_CONN_TIMEOUT_MS,
        authTimeout: DEFAULTS.IMAP_AUTH_TIMEOUT_MS,
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        this.logger.log('[IMAP] ✓ Connected successfully');
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            this.logger.error('[IMAP] ✗ Failed to open INBOX:', err.message);
            try { imap.end(); } catch (e) { /* ignore */ }
            safeReject(err);
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
                  try { imap.end(); } catch (e) { /* ignore */ }
                  safeReject(fallbackErr);
                  return;
                }
                this.processSearchResultsSafe(imap, fallbackResults || [], emails, safeResolve);
              });
              return;
            }

            this.processSearchResultsSafe(imap, results || [], emails, safeResolve);
          });
        });
      });

      imap.once('error', (imapErr: Error) => {
        this.logger.error('[IMAP] ✗ Connection error:', imapErr.message);
        safeReject(imapErr);
      });

      imap.once('end', () => {
        this.logger.log('[IMAP] Connection ended');
      });

      try {
        imap.connect();
      } catch (error) {
        this.logger.error('[IMAP] ✗ Failed to initiate connection:', error.message);
        safeReject(error);
      }
    });
  }

  private processSearchResultsSafe(
    imap: Imap,
    results: number[],
    emails: EmailMessage[],
    resolve: (emails: EmailMessage[]) => void,
  ): void {
    try {
      this.processSearchResults(imap, results, emails, resolve);
    } catch (error) {
      this.logger.error('[IMAP] Error processing search results:', error.message);
      try { imap.end(); } catch (e) { /* ignore */ }
      resolve([]); // Return empty array on error
    }
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

