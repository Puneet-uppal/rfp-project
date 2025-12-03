/**
 * Application Constants
 * Centralized access to all environment variables
 */

// Load .env file BEFORE reading process.env values
import { config } from 'dotenv';
config();

// Server Configuration
export const SERVER = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Database Configuration
export const DATABASE = {
  HOST: process.env.DATABASE_HOST || 'localhost',
  PORT: parseInt(process.env.DATABASE_PORT || '5432', 10),
  USERNAME: process.env.DATABASE_USERNAME || 'postgres',
  PASSWORD: process.env.DATABASE_PASSWORD || 'postgres',
  NAME: process.env.DATABASE_NAME || 'rfp_management',
};

// AI Configuration (Google Gemini)
export const AI = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
};

// SMTP Configuration (Email Sending)
export const SMTP = {
  HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SECURE: process.env.SMTP_SECURE === 'true',
  USER: process.env.SMTP_USER,
  PASSWORD: process.env.SMTP_PASSWORD,
};

// IMAP Configuration (Email Receiving)
export const IMAP = {
  HOST: process.env.IMAP_HOST || 'imap.gmail.com',
  PORT: parseInt(process.env.IMAP_PORT || '993', 10),
  USER: process.env.IMAP_USER,
  PASSWORD: process.env.IMAP_PASSWORD,
  TLS: process.env.IMAP_TLS !== 'false',
};

// Email Sender Configuration
export const EMAIL_FROM = {
  EMAIL: process.env.EMAIL_FROM,
  NAME: process.env.EMAIL_FROM_NAME || 'RFP Management System',
};

// Email Webhook Configuration
export const EMAIL_WEBHOOK = {
  SECRET: process.env.EMAIL_WEBHOOK_SECRET,
};

// API Configuration
export const API = {
  PREFIX: 'api',
  DOCS_PATH: 'api/docs',
};

// Application Defaults
export const DEFAULTS = {
  PAGINATION_LIMIT: 20,
  IMAP_POLL_INTERVAL_MS: 60000,
  SMTP_CONNECTION_TIMEOUT_MS: 10000,
  SMTP_GREETING_TIMEOUT_MS: 10000,
  SMTP_SOCKET_TIMEOUT_MS: 30000,
  IMAP_CONNECTION_TIMEOUT_MS: 30000,
  IMAP_CONN_TIMEOUT_MS: 15000,
  IMAP_AUTH_TIMEOUT_MS: 15000,
  AI_MAX_RETRIES: 5,
  AI_BACKOFF_SCHEDULE_MS: [1000, 30000, 60000, 90000],
  EMAIL_SEND_MAX_RETRIES: 3,
};

