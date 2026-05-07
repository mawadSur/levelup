export interface OtelConfig {
  serviceName: string;
  endpoint: string | undefined;
  headers: string | undefined;
  sampler: string;
  samplerArg: string;
}

export function resolveConfig(serviceName: string): OtelConfig {
  return {
    serviceName: process.env['OTEL_SERVICE_NAME'] ?? serviceName,
    endpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
    headers: process.env['OTEL_EXPORTER_OTLP_HEADERS'],
    sampler: process.env['OTEL_TRACES_SAMPLER'] ?? 'parentbased_traceidratio',
    samplerArg: process.env['OTEL_TRACES_SAMPLER_ARG'] ?? '0.1',
  };
}

export function isEndpointDisabled(endpoint: string | undefined): boolean {
  return !endpoint || endpoint.startsWith('PLACEHOLDER_');
}
