import { resolveConfig, isEndpointDisabled } from './config.js';
import { createStubHandle } from './stub.js';
import type { OtelHandle } from './stub.js';

export type { OtelHandle };
export type { OtelConfig } from './config.js';

export interface StartOtelOptions {
  serviceName: string;
}

export async function startOtel(opts: StartOtelOptions): Promise<OtelHandle> {
  const config = resolveConfig(opts.serviceName);

  if (isEndpointDisabled(config.endpoint)) {
    return createStubHandle();
  }

  const { startSdk } = await import('./sdk.js');
  return startSdk(config);
}
