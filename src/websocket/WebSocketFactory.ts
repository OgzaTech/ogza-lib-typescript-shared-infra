import { IWebSocketServer, IWebSocketClient } from '@ogza/core';
import { 
  SocketIOServerAdapter,
  SocketIOClientAdapter,
  NativeWebSocketAdapter,
  type WebSocketConfig
} from '@ogza/core';

/**
 * WebSocket Server Provider Types
 */
export type WebSocketServerProvider = 'SOCKET_IO';

/**
 * WebSocket Client Provider Types
 */
export type WebSocketClientProvider = 'SOCKET_IO' | 'NATIVE';

/**
 * WebSocketServerFactory - WebSocket server oluşturma factory
 */
export class WebSocketServerFactory {
  static create(
    provider: WebSocketServerProvider,
    io: any,
    config?: WebSocketConfig
  ): IWebSocketServer {
    switch (provider) {
      case 'SOCKET_IO':
        return new SocketIOServerAdapter(io, config);
      
      default:
        throw new Error(`Unsupported WebSocket server provider: ${provider}`);
    }
  }
}

/**
 * WebSocketClientFactory - WebSocket client oluşturma factory
 */
export class WebSocketClientFactory {
  static create(
    provider: WebSocketClientProvider,
    socket?: any
  ): IWebSocketClient {
    switch (provider) {
      case 'SOCKET_IO':
        if (!socket) {
          throw new Error('Socket.IO client instance is required');
        }
        return new SocketIOClientAdapter(socket);
      
      case 'NATIVE':
        return new NativeWebSocketAdapter();
      
      default:
        throw new Error(`Unsupported WebSocket client provider: ${provider}`);
    }
  }
}