import { useCallback, useEffect, useState } from 'react';
import type { StoredApiKey } from '../lib/types';
import { loadApiKeys, saveApiKeys } from '../lib/storage';

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<StoredApiKey[]>([]);

  useEffect(() => {
    setApiKeys(loadApiKeys());
  }, []);

  const upsertKey = useCallback((key: StoredApiKey) => {
    setApiKeys((prev) => {
      const next = prev.some((k) => k.id === key.id)
        ? prev.map((k) => (k.id === key.id ? key : k))
        : [...prev, key];
      saveApiKeys(next);
      return next;
    });
  }, []);

  const deleteKey = useCallback((keyId: string) => {
    setApiKeys((prev) => {
      const next = prev.filter((k) => k.id !== keyId);
      saveApiKeys(next);
      return next;
    });
  }, []);

  const keysForProvider = useCallback(
    (providerId: string) => apiKeys.filter((k) => k.providerId === providerId),
    [apiKeys]
  );

  return { apiKeys, upsertKey, deleteKey, keysForProvider };
}
