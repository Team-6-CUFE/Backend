import { Catch, ArgumentsHost, Logger, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    let message: string | object;

    if (exception instanceof WsException) {
      message = exception.getError();
    } else if (exception instanceof HttpException) {
      message = exception.getResponse();
    } else {
      message = 'Internal server error';
    }

    this.logger.error(`WS error for ${client.id}:`, exception);
    client.emit('error', { message });
  }
}
