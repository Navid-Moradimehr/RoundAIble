import { useCallback, useEffect, useState } from 'react';
import { apiHealth } from '../lib/api';

export type BackendStatus = 'checking' | 'connected' | 'disconnected';

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking');

  const check = useCallback(async () => {
    const ok = await apiHealth();
    setStatus(ok ? 'connected' : 'disconnected');
    return ok;
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [check]);

  return { status, check };
}
