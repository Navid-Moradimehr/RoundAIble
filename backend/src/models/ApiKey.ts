export interface ApiKey {
  id: string;
  provider: string;
  name: string;
  encryptedKey: string;
  createdAt: Date;
  lastUsed?: Date;
} 