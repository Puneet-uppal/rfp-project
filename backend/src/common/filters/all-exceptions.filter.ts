import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SERVER } from '../../config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Error';
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Handle third-party API errors
      const errorMessage = exception.message || '';
      
      // Google Gemini API errors
      if (errorMessage.includes('GoogleGenerativeAI')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'AI Service Error';
        
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
          message = 'AI service is temporarily overloaded. Please try again in a few moments.';
        } else if (errorMessage.includes('API key')) {
          message = 'AI service configuration error. Please contact support.';
        } else {
          message = 'AI service is temporarily unavailable. Please try again later.';
        }
      }
      // SMTP/Email errors
      else if (errorMessage.includes('SMTP') || errorMessage.includes('nodemailer') || errorMessage.includes('ECONNREFUSED')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Email Service Error';
        message = 'Email service is temporarily unavailable. Please try again later.';
      }
      // IMAP errors
      else if (errorMessage.includes('IMAP') || errorMessage.includes('imap')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Email Fetch Error';
        message = 'Unable to fetch emails at this time. Please try again later.';
      }
      // Database connection errors
      else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('SequelizeConnectionError')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Database Error';
        message = 'Database service is temporarily unavailable. Please try again later.';
      }
      // Network errors
      else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ENOTFOUND')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        error = 'Network Error';
        message = 'Unable to connect to external service. Please check your connection.';
      }
      // JSON parsing errors
      else if (errorMessage.includes('JSON') || errorMessage.includes('Unexpected token')) {
        status = HttpStatus.BAD_REQUEST;
        error = 'Parse Error';
        message = 'Failed to process the response. Please try again.';
      }
      // Generic error
      else {
        message = 'An unexpected error occurred. Please try again.';
      }

      // Log the full error for debugging
      this.logger.error(
        `[${request.method}] ${request.url} - ${error}: ${exception.message}`,
        exception.stack,
      );
    }

    // Don't expose stack traces in production
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
    };

    if (SERVER.IS_DEVELOPMENT && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
