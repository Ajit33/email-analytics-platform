// src/common/filters/global-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(
    GlobalExceptionFilter.name,
  );

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object =
      'Internal server error';
    let error = 'Internal Server Error';

    // ── Known HTTP exceptions (400, 401, 404, 409, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse =
        exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message ||
            exceptionResponse
          : exceptionResponse;
      error = exception.name;
    }

    // ── Database errors
    else if (
      exception instanceof QueryFailedError
    ) {
      const dbError = exception as any;

      // Unique constraint violation
      if (dbError.code === '23505') {
        status = HttpStatus.CONFLICT;
        message =
          'A record with this value already exists';
        error = 'Conflict';
      }
      // Foreign key violation
      else if (dbError.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message =
          'Referenced record does not exist';
        error = 'Bad Request';
      }
      // Not null violation
      else if (dbError.code === '23502') {
        status = HttpStatus.BAD_REQUEST;
        message = `Missing required field: ${dbError.column}`;
        error = 'Bad Request';
      }
      // Other DB errors
      else {
        this.logger.error(
          `Database error: ${dbError.message}`,
          dbError.stack,
        );
      }
    }

    // ── Unknown errors — log full stack trace
    else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    // ── Build consistent error response
    const errorResponse = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Only log 5xx errors as errors — 4xx are client mistakes
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error
          ? exception.stack
          : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
