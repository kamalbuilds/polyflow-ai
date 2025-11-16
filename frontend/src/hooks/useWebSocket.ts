import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketProps {
  url?: string;
  options?: {
    autoConnect?: boolean;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
    reconnectInterval?: number;
  };
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  sendMessage: (type: string, data: any) => void;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export const useWebSocket = ({
  url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080',
  options = {},
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketProps = {}): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);

  const {
    autoConnect = true,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      setConnectionError(null);

      socketRef.current = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: false,
      });

      socketRef.current.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        onConnect?.();
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        onDisconnect?.();

        // Auto-reconnect logic
        if (reconnect && reason !== 'io client disconnect') {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            setTimeout(() => {
              reconnectAttempts.current++;
              console.log(`Reconnect attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
              connect();
            }, reconnectInterval);
          } else {
            setConnectionError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
          }
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        onError?.(error);
      });

      // Handle custom message events
      socketRef.current.on('message', (message: WebSocketMessage) => {
        onMessage?.(message);
      });

      // Handle specific event types
      socketRef.current.on('transaction_update', (data) => {
        onMessage?.({
          type: 'transaction_update',
          data,
          timestamp: Date.now(),
        });
      });

      socketRef.current.on('xcm_message', (data) => {
        onMessage?.({
          type: 'xcm_message',
          data,
          timestamp: Date.now(),
        });
      });

      socketRef.current.on('workflow_update', (data) => {
        onMessage?.({
          type: 'workflow_update',
          data,
          timestamp: Date.now(),
        });
      });

      socketRef.current.on('ai_response', (data) => {
        onMessage?.({
          type: 'ai_response',
          data,
          timestamp: Date.now(),
        });
      });

      socketRef.current.connect();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnect, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', {
        type,
        data,
        timestamp: Date.now(),
      });
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { type, data });
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channel);
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channel);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    sendMessage,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
};

// Hook for blockchain events
export const useBlockchainWebSocket = (chainId?: string) => {
  const [blockUpdates, setBlockUpdates] = useState<any[]>([]);
  const [transactionUpdates, setTransactionUpdates] = useState<any[]>([]);

  const { isConnected, sendMessage, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'block_update':
          setBlockUpdates(prev => [message.data, ...prev.slice(0, 99)]);
          break;
        case 'transaction_update':
          setTransactionUpdates(prev => [message.data, ...prev.slice(0, 99)]);
          break;
      }
    },
  });

  useEffect(() => {
    if (isConnected && chainId) {
      subscribe(`blockchain:${chainId}`);
      return () => unsubscribe(`blockchain:${chainId}`);
    }
  }, [isConnected, chainId, subscribe, unsubscribe]);

  return {
    blockUpdates,
    transactionUpdates,
    isConnected,
    subscribeToChain: (id: string) => subscribe(`blockchain:${id}`),
    unsubscribeFromChain: (id: string) => unsubscribe(`blockchain:${id}`),
  };
};

// Hook for AI chat WebSocket
export const useAIChatWebSocket = () => {
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const { isConnected, sendMessage, subscribe } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'ai_response':
          setAiMessages(prev => [...prev, message.data]);
          setIsAiTyping(false);
          break;
        case 'ai_typing':
          setIsAiTyping(message.data.isTyping);
          break;
      }
    },
  });

  useEffect(() => {
    if (isConnected) {
      subscribe('ai_chat');
    }
  }, [isConnected, subscribe]);

  const sendAiMessage = useCallback((message: string, context?: any) => {
    setIsAiTyping(true);
    sendMessage('ai_chat', {
      message,
      context,
      userId: localStorage.getItem('user_id'),
    });
  }, [sendMessage]);

  return {
    aiMessages,
    isAiTyping,
    isConnected,
    sendAiMessage,
  };
};

// Hook for workflow collaboration
export const useWorkflowWebSocket = (workflowId?: string) => {
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [workflowUpdates, setWorkflowUpdates] = useState<any[]>([]);

  const { isConnected, sendMessage, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'collaborator_join':
          setCollaborators(prev => [...prev, message.data]);
          break;
        case 'collaborator_leave':
          setCollaborators(prev => prev.filter(c => c.id !== message.data.id));
          break;
        case 'workflow_update':
          setWorkflowUpdates(prev => [message.data, ...prev.slice(0, 49)]);
          break;
      }
    },
  });

  useEffect(() => {
    if (isConnected && workflowId) {
      subscribe(`workflow:${workflowId}`);
      return () => unsubscribe(`workflow:${workflowId}`);
    }
  }, [isConnected, workflowId, subscribe, unsubscribe]);

  const broadcastWorkflowUpdate = useCallback((update: any) => {
    sendMessage('workflow_update', {
      workflowId,
      update,
      userId: localStorage.getItem('user_id'),
    });
  }, [sendMessage, workflowId]);

  return {
    collaborators,
    workflowUpdates,
    isConnected,
    broadcastWorkflowUpdate,
  };
};

export default useWebSocket;