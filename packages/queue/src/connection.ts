import Redis from 'ioredis';
import { redisOptions } from './config.js';

/**
 * Singleton ioredis `Redis` instance used by all BullMQ Queues, Workers, and
 * QueueEvents in this process.
 *
 * BullMQ mandates that the connection object is NOT shared between a Queue and
 * a Worker (each gets its own internal clone), but it IS safe to pass the same
 * `Redis` instance as the `connection` option — BullMQ duplicates it internally
 * as needed.  Using a singleton avoids spawning extra TCP connections per queue.
 *
 * `maxRetriesPerRequest: null` is set in `config.ts` and is a hard BullMQ
 * requirement: without it, ioredis throws on blocked commands such as BLPOP.
 */

let _connection: Redis | undefined;

export function getConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(redisOptions);

    _connection.on('error', (err: Error) => {
      console.error('[queue] Redis connection error:', err.message);
    });

    _connection.on('connect', () => {
      console.info('[queue] Redis connected');
    });

    _connection.on('reconnecting', () => {
      console.warn('[queue] Redis reconnecting…');
    });
  }

  return _connection;
}
