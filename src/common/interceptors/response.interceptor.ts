import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';
import type { ApiResponse } from '../models/api-response';
import { DateUtil } from '../utils/date.util';

function serializeDates(obj: unknown): unknown {
  if (obj instanceof Date) return DateUtil.format(obj);
  if (Array.isArray(obj)) return obj.map(serializeDates);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result;
  }
  return obj;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        timestamp: DateUtil.now(),
        path: request.url,
        data: serializeDates(data) as T,
      })),
    );
  }
}
