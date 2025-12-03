import { registerAs } from '@nestjs/config';
import { SMTP, IMAP, EMAIL_FROM, EMAIL_WEBHOOK } from './constants';

export default registerAs('email', () => ({
  smtp: {
    host: SMTP.HOST,
    port: SMTP.PORT,
    secure: SMTP.SECURE,
    user: SMTP.USER,
    password: SMTP.PASSWORD,
  },
  imap: {
    host: IMAP.HOST,
    port: IMAP.PORT,
    user: IMAP.USER,
    password: IMAP.PASSWORD,
    tls: IMAP.TLS,
  },
  from: {
    email: EMAIL_FROM.EMAIL,
    name: EMAIL_FROM.NAME,
  },
  webhookSecret: EMAIL_WEBHOOK.SECRET,
}));
