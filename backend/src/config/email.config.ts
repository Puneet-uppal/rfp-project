import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
  imap: {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    tls: process.env.IMAP_TLS !== 'false',
  },
  from: {
    email: process.env.EMAIL_FROM,
    name: process.env.EMAIL_FROM_NAME || 'RFP Management System',
  },
  webhookSecret: process.env.EMAIL_WEBHOOK_SECRET,
}));

