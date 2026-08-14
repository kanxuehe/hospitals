import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (!(exception instanceof HttpException)) {
      console.error(exception);
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message
            ? Array.isArray((res as any).message)
              ? (res as any).message[0]
              : (res as any).message
            : exception.message;
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
