# @levelup/observability

Shared OpenTelemetry bootstrap for LevelUp AI Academy services.

## How it works

`startOtel({ serviceName })` reads environment variables and either:

- **Stub mode** — when `OTEL_EXPORTER_OTLP_ENDPOINT` is missing or starts with
  `PLACEHOLDER_`, logs `[otel] disabled (no endpoint set)` once and returns a
  no-op `shutdown()`. No SDK overhead at all.
- **Live mode** — initialises `@opentelemetry/sdk-node` with the OTLP HTTP
  exporter and `getNodeAutoInstrumentations`. Auto-instrumentation covers HTTP,
  Express, NestJS, Prisma, BullMQ, ioredis, OpenAI, and fetch out of the box.

## Environment variables

| Variable                      | Default                     | Description                                                         |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------- |
| `OTEL_SERVICE_NAME`           | value passed to `startOtel` | Overrides the service name reported to the collector                |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_                   | Base URL of your OTLP collector, e.g. `https://api.honeycomb.io`    |
| `OTEL_EXPORTER_OTLP_HEADERS`  | _(unset)_                   | Comma-separated `key=value` pairs, e.g. `x-honeycomb-team=YOUR_KEY` |
| `OTEL_TRACES_SAMPLER`         | `parentbased_traceidratio`  | Sampler type                                                        |
| `OTEL_TRACES_SAMPLER_ARG`     | `0.1`                       | Sampler argument (10 % of root spans)                               |

## Pointing to a real OTLP endpoint

### Honeycomb

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_HONEYCOMB_API_KEY
OTEL_SERVICE_NAME=levelup-api
```

### Grafana Cloud Tempo

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic YOUR_BASE64_ENCODED_CREDENTIALS
OTEL_SERVICE_NAME=levelup-api
```

### Local Tempo (docker compose)

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=levelup-api
OTEL_TRACES_SAMPLER_ARG=1.0
```

## Auto-instrumentation vs manual

This package defaults to **auto-instrumentation** via
`getNodeAutoInstrumentations`. This means zero per-library wiring for:
HTTP (Node core), Express, NestJS, Prisma, BullMQ, ioredis, OpenAI SDK, and
undici/fetch.

`@opentelemetry/instrumentation-fs` is explicitly disabled because it produces
high-cardinality, low-signal spans for every filesystem read.

Manual spans can be added at any time using the `@opentelemetry/api` tracer:

```ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-module');
const span = tracer.startSpan('my-operation');
// ... work ...
span.end();
```

## Web / Next.js

Browser-side traces are **not included in this package**. The API already
receives server-side traces covering all inbound HTTP requests. Adding browser
traces requires the `@opentelemetry/sdk-trace-web` package together with a
Next.js instrumentation hook (`instrumentation.ts`), which is a separate task.
