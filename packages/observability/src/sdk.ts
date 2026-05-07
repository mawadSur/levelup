import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import type { OtelConfig } from './config.js';
import type { OtelHandle } from './stub.js';

export async function startSdk(config: OtelConfig): Promise<OtelHandle> {
  // Resolve service version from the closest package.json at runtime.
  // Falls back to 'unknown' when the file is absent (e.g. inside a Docker layer).
  let serviceVersion = 'unknown';
  try {
    // Node 22+ supports JSON imports directly; for broader compat we require().
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../apps/api/package.json') as { version?: string };
    serviceVersion = pkg.version ?? 'unknown';
  } catch {
    // intentionally swallowed — version is informational
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] ?? 'development',
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${config.endpoint}/v1/traces`,
    headers: parseHeaders(config.headers),
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy fs instrumentation that produces high-cardinality spans
        // with no actionable signal in production.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  return {
    shutdown: async () => {
      await sdk.shutdown();
    },
  };
}

function parseHeaders(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split(',')
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf('=');
        if (idx === -1) return [pair, ''] as [string, string];
        return [pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()] as [string, string];
      }),
  );
}
