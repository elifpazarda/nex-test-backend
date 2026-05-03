import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { DateUtil } from '../utils/date.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Unhandled exception at ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    let message: string[] = ['Internal server error'];

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = [res];
      } else if (typeof res === 'object' && res !== null) {
        const payload = res as { message?: string | string[] };
        const raw = payload.message ?? exception.message;
        message = Array.isArray(raw) ? raw : [raw];
      } else {
        message = [exception.message];
      }
    }

    response.status(statusCode).json({
      success: false,
      timestamp: DateUtil.now(),
      path: request.url,
      error: {
        statusCode,
        message,
      },
    });
  }
}
