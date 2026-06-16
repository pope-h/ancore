import { installMessageDispatcher } from '@/messaging';
import { registerInternalHandlers, probeServicesOnStartup } from './handlers';
import { restoreUnlockSessionFromStorage } from './session-state';

type ChromeRuntimeManifest = {
  name: string;
  version: string;
};

type ChromeInstalledDetails = {
  reason: string;
};

declare const chrome: {
  runtime: {
    getManifest(): ChromeRuntimeManifest;
    onInstalled: {
      addListener(callback: (details: ChromeInstalledDetails) => void): void;
    };
    onStartup: {
      addListener(callback: () => void): void;
    };
    onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: { url?: string; origin?: string },
          sendResponse: (response: unknown) => void
        ) => boolean | void
      ): void;
    };
  };
};

const logPrefix = '[ancore-extension/background]';

const runtime = (globalThis as { chrome?: { runtime?: typeof chrome.runtime } }).chrome?.runtime;
const manifest = (runtime?.getManifest?.() as ChromeRuntimeManifest | undefined) ?? {
  name: 'ancore-extension-wallet',
  version: '0.0.0',
};

console.info(`${logPrefix} booted`, {
  name: manifest.name,
  version: manifest.version,
});

void restoreUnlockSessionFromStorage().then((restored) => {
  if (restored) {
    console.info(`${logPrefix} unlock session restored from chrome.storage.session`);
  }
});

runtime?.onInstalled?.addListener((details: ChromeInstalledDetails) => {
  console.info(`${logPrefix} installed`, { reason: details.reason });
});

runtime?.onStartup?.addListener(() => {
  console.info(`${logPrefix} startup`);
  probeServicesOnStartup().catch((err) => {
    console.warn(`${logPrefix} health probe failed on startup`, err);
  });
});

/**
 * Stub listener for content script external API forwards.
 * Replace with registerExternalHandlers() — see docs/wallets/FREIGHTER_COMPARISON.md §3.1
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const payload = message as {
    type?: string;
    requestId?: string;
    method?: string;
    origin?: string;
  };

  if (payload?.type !== 'EXTERNAL_API_REQUEST') {
    return;
  }

  console.warn(`${logPrefix} external API stub`, {
    method: payload.method,
    origin: payload.origin ?? sender.origin,
    requestId: payload.requestId,
  });

  sendResponse({
    ok: false,
    error:
      'External dApp API handlers not implemented yet. See docs/wallets/FREIGHTER_COMPARISON.md',
  });

  return false;
});

registerInternalHandlers();
installMessageDispatcher();
