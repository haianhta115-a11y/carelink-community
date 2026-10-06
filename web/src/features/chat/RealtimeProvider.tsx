import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { HubConnectionBuilder, LogLevel, HttpError } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { readAuth } from '../../lib/auth-storage';
type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
const RealtimeContext = createContext<ConnectionStatus>('disconnected');
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  useEffect(() => {
    if (!auth?.token) {
      setStatus('disconnected');
      return;
    }
    let disposed = false;
    let retry: ReturnType<typeof setTimeout>;
    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''}/hubs/chat`, { accessTokenFactory: () => readAuth()?.token ?? '' })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.None)
      .build();
    function refresh() {
      void client.invalidateQueries({
        predicate: (query) =>
          ['requests', 'request', 'history', 'sessions', 'session', 'messages', 'review', 'unread', 'personal-summary'].includes(
            query.queryKey[0] as string,
          ),
      });
    }
    connection.on('RequestStatusChanged', refresh);
    connection.on('ReceiveMessage', refresh);
    connection.on('MessagesRead', refresh);
    connection.on('ForceLogout', () => window.dispatchEvent(new Event('carelink:unauthorized')));
    connection.onreconnecting(() => {
      if (!disposed) setStatus('reconnecting');
    });
    connection.onreconnected(() => {
      if (!disposed) {
        setStatus('connected');
        refresh();
      }
    });
    async function start() {
      if (disposed) return;
      try {
        await connection.start();
        if (!disposed) {
          setStatus('connected');
          refresh();
        }
      } catch (error) {
        if (!disposed) {
          if (error instanceof HttpError && error.statusCode === 401) { window.dispatchEvent(new Event('carelink:unauthorized')); return; }
          setStatus('reconnecting');
          retry = setTimeout(() => void start(), 5000);
        }
      }
    }
    connection.onclose(() => {
      if (!disposed) {
        setStatus('reconnecting');
        retry = setTimeout(() => void start(), 5000);
      }
    });
    void start();
    return () => {
      disposed = true;
      clearTimeout(retry);
      void connection.stop();
    };
  }, [auth?.token, client]);
  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>;
}
export function useRealtime() {
  return useContext(RealtimeContext);
}
