export interface OtelHandle {
  shutdown: () => Promise<void>;
}

let _logged = false;

export function createStubHandle(): OtelHandle {
  if (!_logged) {
    _logged = true;
    console.log('[otel] disabled (no endpoint set)');
  }
  return {
    shutdown: () => Promise.resolve(),
  };
}
