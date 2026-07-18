import { devLoopbackOrigin } from '@/lib/dev-loopback-host';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LINKS } from '@/lib/links';
import { getAccessToken } from '@/lib/api/auth-client';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export function useAudioSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  /** Forces a re-render when `socketRef` is assigned so consumers see the Socket before `connect` fires. */
  const [, setSocketRevision] = useState(0);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = getAccessToken();
    const baseUrl = isAigeniusDesktopRuntime() ? devLoopbackOrigin(8001) : LINKS.noboxAPIRootUrl;

    const socket = io(`${baseUrl}/audio`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[AudioSocket] Connected');
      setIsConnected(true);
      // Re-render consumers so TTS/STT hooks see socket.connected === true.
      setSocketRevision((n) => n + 1);
    });

    socket.on('disconnect', () => {
      console.log('[AudioSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('audio:error', (err: { message: string }) => {
      console.error('[AudioSocket] Error:', err.message);
    });

    socketRef.current = socket;
    setSocketRevision((n) => n + 1);
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocketRevision((n) => n + 1);
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };
}
