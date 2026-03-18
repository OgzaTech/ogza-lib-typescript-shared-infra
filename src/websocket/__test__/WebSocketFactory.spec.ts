import { describe, it, expect } from 'vitest';
import { WebSocketServerFactory, WebSocketClientFactory } from '../WebSocketFactory';

describe('WebSocketServerFactory', () => {
  it('should create SocketIOServerAdapter', () => {
    const mockIO = {
      on: () => {},
      emit: () => {},
      close: () => {}
    };

    const server = WebSocketServerFactory.create('SOCKET_IO', mockIO);
    expect(server).toBeDefined();
  });

  it('should throw error for unsupported provider', () => {
    const mockIO = {};

    expect(() => {
      WebSocketServerFactory.create('INVALID' as any, mockIO);
    }).toThrow('Unsupported WebSocket server provider');
  });
});

describe('WebSocketClientFactory', () => {
  it('should create SocketIOClientAdapter', () => {
    const mockSocket = {
      on: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {}
    };

    const client = WebSocketClientFactory.create('SOCKET_IO', mockSocket);
    expect(client).toBeDefined();
  });

  it('should create NativeWebSocketAdapter', () => {
    const client = WebSocketClientFactory.create('NATIVE');
    expect(client).toBeDefined();
  });

  it('should throw error for Socket.IO without client', () => {
    expect(() => {
      WebSocketClientFactory.create('SOCKET_IO');
    }).toThrow('Socket.IO client instance is required');
  });

  it('should throw error for unsupported provider', () => {
    expect(() => {
      WebSocketClientFactory.create('INVALID' as any);
    }).toThrow('Unsupported WebSocket client provider');
  });
});