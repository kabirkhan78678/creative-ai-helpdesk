import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User, RemoteSessionPrompt } from '../types';
import { getWsUrl } from '../config/api';

interface WebSocketContextType {
  isConnected: boolean;
  sendEvent: (event: string, data: any) => void;
  addListener: (event: string, callback: (data: any) => void) => () => void;
  activeRemotePrompt: RemoteSessionPrompt | null;
  dismissRemotePrompt: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ 
  children, 
  currentUser 
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeRemotePrompt, setActiveRemotePrompt] = useState<RemoteSessionPrompt | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const connect = useCallback(() => {
    if (!currentUser) {
      setIsConnected(false);
      return;
    }
    const wsUrl = getWsUrl(currentUser.id, currentUser.role);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('⚡ Connected to Creative AI Real-Time Core');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { event: eventType, data } = payload;

        if (eventType === 'REMOTE_SESSION_PROMPT') {
          // Do not show the prompt to the initiating Admin
          const isInitiatingAdmin =
            currentUser?.id === data.admin_id &&
            (currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN');

          if (!isInitiatingAdmin) {
            let isTargetMachine = true;
            if (typeof window !== 'undefined' && (window as any).electronAPI?.getSystemSpecs) {
              const localSpecs = (window as any).electronAPI.getSystemSpecs();
              if (localSpecs?.hostname && data.target_hostname) {
                isTargetMachine =
                  localSpecs.hostname.toLowerCase() === data.target_hostname.toLowerCase();
              }
            }
            if (isTargetMachine || currentUser?.id === data.employee_id) {
              setActiveRemotePrompt(data);
            }
          }
        }

        if (eventType === 'REMOTE_DESK_STOP') {
          setActiveRemotePrompt(null);
        }

        const listeners = listenersRef.current.get(eventType);
        if (listeners) {
          listeners.forEach(cb => cb(data));
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket encountered error, attempting recovery...', err);
      ws.close();
    };

    socketRef.current = ws;
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendEvent = useCallback((event: string, data: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data }));
    } else {
      console.warn('Cannot send event, WebSocket is not open:', event);
    }
  }, []);

  const addListener = useCallback((event: string, callback: (data: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Unsubscribe function
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  const dismissRemotePrompt = () => setActiveRemotePrompt(null);

  return (
    <WebSocketContext.Provider value={{
      isConnected,
      sendEvent,
      addListener,
      activeRemotePrompt,
      dismissRemotePrompt
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

