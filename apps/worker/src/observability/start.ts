import { startOtel } from '@levelup/observability';
import type { OtelHandle } from '@levelup/observability';

let _handle: OtelHandle | undefined;

void startOtel({ serviceName: 'levelup-worker' }).then((handle) => {
  _handle = handle;
});

export function getOtelHandle(): OtelHandle | undefined {
  return _handle;
}
