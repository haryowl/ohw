// frontend/src/hooks/useWebSocket.js

import { useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage, options = {}) => {
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const messageQueue = useRef([]);
  const isProcessing = useRef(false);
  
  const {
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    throttleInterval = 100, // Throttle messages to prevent UI blocking
    maxMessageQueueSize = 100,
    enableCompression = true,
    heartbeatInterval = 30000
  } = options;

  const reconnectAttempts = useRef(0);

  // Throttled message processing
  const processMessageQueue = useCallback(() => {
    if (isProcessing.current || messageQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    
    // Process messages in batches to prevent UI blocking
    const batchSize = 10;
    const batch = messageQueue.current.splice(0, batchSize);
    
    try {
      batch.forEach(message => {
        onMessage(message);
      });
    } catch (error) {
      console.error('Error processing WebSocket messages:', error);
    } finally {
      isProcessing.current = false;
      
      // Continue processing if there are more messages
      if (messageQueue.current.length > 0) {
        setTimeout(processMessageQueue, throttleInterval);
      }
    }
  }, [onMessage, throttleInterval]);

  // Add message to queue with size limit
  const queueMessage = useCallback((message) => {
    if (messageQueue.current.length >= maxMessageQueueSize) {
      // Remove oldest messages to make room
      const excess = messageQueue.current.length - maxMessageQueueSize + 1;
      messageQueue.current.splice(0, excess);
      console.warn(`WebSocket message queue full, dropped ${excess} old messages`);
    }
    
    messageQueue.current.push(message);
    
    // Start processing if not already running
    if (!isProcessing.current) {
      setTimeout(processMessageQueue, throttleInterval);
    }
  }, [maxMessageQueueSize, processMessageQueue, throttleInterval]);

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws';
    console.log('Connecting to WebSocket:', wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);

      // Set connection properties
      ws.current.binaryType = 'arraybuffer';
      
      // Enable compression if supported
      if (enableCompression && ws.current.extensions) {
        console.log('WebSocket extensions available:', ws.current.extensions);
      }

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts.current = 0;
        
        // Send initial subscription if needed
        if (options.initialSubscription) {
          ws.current.send(JSON.stringify(options.initialSubscription));
        }
        
        // Start heartbeat
        if (heartbeatInterval > 0) {
          ws.current.heartbeatInterval = setInterval(() => {
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
          }, heartbeatInterval);
        }
      };

      ws.current.onmessage = (event) => {
        try {
          // Handle binary data if needed
          let data;
          if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            const text = decoder.decode(event.data);
            data = JSON.parse(text);
          } else {
            data = JSON.parse(event.data);
          }

          // Queue the message for processing
          queueMessage(data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Clear heartbeat
        if (ws.current.heartbeatInterval) {
          clearInterval(ws.current.heartbeatInterval);
        }

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval * reconnectAttempts.current);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [url, options.initialSubscription, heartbeatInterval, enableCompression, maxReconnectAttempts, reconnectInterval, queueMessage]);

  // Send message with error handling
  const sendMessage = useCallback((message) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, message not sent');
      return false;
    }
  }, []);

  // Subscribe to device
  const subscribeToDevice = useCallback((deviceId) => {
    return sendMessage({
      type: 'subscribe',
      deviceId
    });
  }, [sendMessage]);

  // Unsubscribe from device
  const unsubscribeFromDevice = useCallback((deviceId) => {
    return sendMessage({
      type: 'unsubscribe',
      deviceId
    });
  }, [sendMessage]);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    if (!ws.current) return 'disconnected';
    
    switch (ws.current.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }, []);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    return {
      queueSize: messageQueue.current.length,
      isProcessing: isProcessing.current,
      reconnectAttempts: reconnectAttempts.current,
      connectionStatus: getConnectionStatus()
    };
  }, [getConnectionStatus]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      if (ws.current) {
        if (ws.current.heartbeatInterval) {
          clearInterval(ws.current.heartbeatInterval);
        }
        ws.current.close(1000, 'Component unmounting');
      }
      
      // Clear message queue
      messageQueue.current = [];
    };
  }, [connect]);

  return {
    ws: ws.current,
    sendMessage,
    subscribeToDevice,
    unsubscribeFromDevice,
    getConnectionStatus,
    getQueueStats,
    reconnect: connect
  };
};

export default useWebSocket;
