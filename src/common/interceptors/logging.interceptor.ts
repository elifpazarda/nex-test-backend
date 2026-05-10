import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';
import chalk from 'chalk';

const METHOD_COLORS: Record<string, chalk.Chalk> = {
  GET: chalk.green,
  POST: chalk.yellow,
  PATCH: chalk.blue,
  PUT: chalk.magenta,
  DELETE: chalk.red,
};

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const SEPARATOR = chalk.gray('─'.repeat(60));

function colorMethod(method: string): string {
  const colorFn = METHOD_COLORS[method] ?? chalk.white;
  return colorFn.bold(method.padEnd(7));
}

function colorStatus(status: number): string {
  const text = `${status} ${STATUS_TEXT[status] ?? ''}`.trim();
  if (status < 300) return chalk.green.bold(text);
  if (status < 400) return chalk.cyan.bold(text);
  if (status < 500) return chalk.yellow.bold(text);
  return chalk.red.bold(text);
}

function colorDuration(ms: number): string {
  const text = `${ms}ms`;
  if (ms < 100) return chalk.green(text);
  if (ms < 500) return chalk.yellow(text);
  return chalk.red(text);
}

function timestamp(): string {
  return chalk.gray(new Date().toLocaleTimeString('tr-TR', { hour12: false }));
}

function formatBody(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const entries = Object.entries(body);
  if (entries.length === 0) return '';

  const lines = entries.map(([key, value]) => {
    const masked = /password|token|secret/i.test(key);
    const val = masked ? '***' : JSON.stringify(value);
    return `     ${chalk.gray('•')} ${chalk.white(key)}: ${chalk.cyan(val)}`;
  });

  return '\n' + lines.join('\n');
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body } = request;
    const start = Date.now();

    const bodyStr = ['POST', 'PATCH', 'PUT'].includes(method)
      ? formatBody(body)
      : '';

    console.log(SEPARATOR);
    console.log(
      `  ${chalk.gray('→')}  ${colorMethod(method)} ${chalk.white(url)}  ${timestamp()}`,
    );
    if (bodyStr) console.log(bodyStr);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status = response.statusCode;
        console.log(
          `  ${chalk.gray('←')}  ${colorStatus(status)}  ${chalk.gray('·')}  ${colorDuration(duration)}`,
        );
        console.log(SEPARATOR);
        console.log();
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - start;
        const status =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error instanceof HttpException
            ? error.message
            : 'Internal server error';
        console.log(
          `  ${chalk.gray('←')}  ${colorStatus(status)}  ${chalk.gray('·')}  ${colorDuration(duration)}`,
        );
        console.log(`       ${chalk.red('⚠')}  ${chalk.red(message)}`);
        console.log(SEPARATOR);
        console.log();
        return throwError(() => error);
      }),
    );
  }
}
