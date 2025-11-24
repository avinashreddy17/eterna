import Redis from 'ioredis';

function createRedis() {
  const url = process.env.REDIS_URL;
  if (url) {
    return new Redis(url, { maxRetriesPerRequest: null });
  }
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379');
  const password = process.env.REDIS_PASSWORD;
  const tls = process.env.REDIS_TLS === 'true' ? {} : undefined;
  return new Redis({ host, port, password, tls, maxRetriesPerRequest: null });
}

export const redis = createRedis();
export const redisSub = createRedis();