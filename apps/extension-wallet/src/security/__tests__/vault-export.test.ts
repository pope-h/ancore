import '../../../../../packages/ensure-webcrypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecretKey } from '@ancore/crypto';
import { SecureStorageManager, type StorageAdapter } from '@ancore/core-sdk';

import {
  VaultExportError,
  revealVaultSecret,
  resetVaultStorageManagerForTests,
  verifyVaultPassword,
} from '../vault-export';
import { getSharedStorageManager } from '../storage-manager';

// ── Adapter factory —————————————————————————————————————————————————————————
// The module-level variable is closed over by the vi.mock factory so every
// call to createStorageAdapter() returns the current test's fresh adapter.
let _adapter: MockStorageAdapter;

vi.mock('@ancore/core-sdk', async () => {
  const actual = await vi.importActual<typeof import('@ancore/core-sdk')>('@ancore/core-sdk');
  return {
    ...actual,
    createStorageAdapter: () => _adapter,
  };
});

// ── Mock storage adapter ────────────────────────────────────────────────────
class MockStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const PASSWORD = 'SecurePass123!';
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PRIVATE_KEY = 'SABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789012345678901234567890ABCD';

async function seedVaultAccount(
  storage: MockStorageAdapter,
  account: {
    privateKey: string;
    mnemonic?: string;
    encryptedMnemonic?: Awaited<ReturnType<typeof encryptSecretKey>>;
  }
): Promise<SecureStorageManager> {
  const manager = new SecureStorageManager(storage);
  const unlocked = await manager.unlock(PASSWORD);
  if (!unlocked) throw new Error('seedVaultAccount: unlock failed unexpectedly');
  await manager.saveAccount(account);
  manager.lock();
  return manager;
}

describe('vault-export', () => {
  beforeEach(() => {
    localStorage.clear();
    _adapter = new MockStorageAdapter();
    resetVaultStorageManagerForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies the wallet password against secure storage', async () => {
    await seedVaultAccount(_adapter, { privateKey: PRIVATE_KEY });

    await expect(verifyVaultPassword(PASSWORD)).resolves.toBe(true);
    await expect(verifyVaultPassword('wrong-password')).resolves.toBe(false);
  });

  it('reveals a private key after password verification', async () => {
    const manager = await seedVaultAccount(_adapter, { privateKey: PRIVATE_KEY });

    await expect(
      revealVaultSecret({
        kind: 'privateKey',
        password: PASSWORD,
        requirePassword: true,
        storageManager: manager,
      })
    ).resolves.toBe(PRIVATE_KEY);
  });

  it('reveals a stored mnemonic when secure storage is already unlocked', async () => {
    const manager = await seedVaultAccount(_adapter, {
      privateKey: PRIVATE_KEY,
      mnemonic: MNEMONIC,
    });

    await manager.unlock(PASSWORD);

    await expect(
      revealVaultSecret({
        kind: 'mnemonic',
        password: '',
        requirePassword: false,
        storageManager: manager,
      })
    ).resolves.toBe(MNEMONIC);
  });

  it('decrypts an encrypted mnemonic with @ancore/crypto after password verification', async () => {
    const encryptedMnemonic = await encryptSecretKey(MNEMONIC, PASSWORD);
    const manager = await seedVaultAccount(_adapter, {
      privateKey: PRIVATE_KEY,
      encryptedMnemonic,
    });

    await expect(
      revealVaultSecret({
        kind: 'mnemonic',
        password: PASSWORD,
        requirePassword: true,
        storageManager: manager,
      })
    ).resolves.toBe(MNEMONIC);
  });

  it('rejects incorrect passwords without exposing secret material', async () => {
    const encryptedMnemonic = await encryptSecretKey(MNEMONIC, PASSWORD);
    await seedVaultAccount(_adapter, {
      privateKey: PRIVATE_KEY,
      encryptedMnemonic,
    });

    await expect(
      revealVaultSecret({
        kind: 'mnemonic',
        password: 'wrong-password',
        requirePassword: true,
        storageManager: new SecureStorageManager(_adapter),
      })
    ).rejects.toMatchObject({
      name: 'VaultExportError',
      message: 'Incorrect password.',
    });
  });

  it('requires an unlocked wallet when password checks are disabled', async () => {
    await seedVaultAccount(_adapter, {
      privateKey: PRIVATE_KEY,
      mnemonic: MNEMONIC,
    });

    await expect(
      revealVaultSecret({
        kind: 'mnemonic',
        password: '',
        requirePassword: false,
        storageManager: new SecureStorageManager(_adapter),
      })
    ).rejects.toBeInstanceOf(VaultExportError);
  });

  it('uses the shared unlocked storage manager when password checks are disabled', async () => {
    localStorage.clear();
    resetVaultStorageManagerForTests();

    const manager = getSharedStorageManager();
    await manager.unlock(PASSWORD);
    await manager.saveAccount({
      privateKey: PRIVATE_KEY,
      mnemonic: MNEMONIC,
    });

    await expect(
      revealVaultSecret({
        kind: 'privateKey',
        password: '',
        requirePassword: false,
        storageManager: manager,
      })
    ).resolves.toBe(PRIVATE_KEY);
  });
});
