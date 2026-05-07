import { startOtel } from '@levelup/observability';
import type { OtelHandle } from '@levelup/observability';

let _handle: OtelHandle | undefined;

// Intentionally not awaited at import time — NodeSDK.start() is synchronous
// internally; the promise resolves immediately in stub mode and after SDK
// registration in live mode. The handle is used only for graceful shutdown.
void startOtel({ serviceName: 'levelup-api' }).then((handle) => {
  _handle = handle;
});

export function getOtelHandle(): OtelHandle | undefined {
  return _handle;
}
