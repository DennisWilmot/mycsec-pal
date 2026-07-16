import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as typeof globalThis & {
  myCsecPalRedis?: RedisClientType;
  myCsecPalRedisConnecting?: Promise<RedisClientType>;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured.");

  const client = createClient({
    url,
    socket: {
      connectTimeout: 10_000,
      // Fail this connection after a bounded retry window so Redis outages do not
      // pin application requests indefinitely.
      reconnectStrategy: (retries) =>
        retries >= 5 ? new Error("Redis reconnect limit reached.") : Math.min(250 * 2 ** retries, 5_000),
    },
  });
  client.on("error", (error) => console.error("Redis client error", error));
  return client;
}

/** Shared command connection for rate limits and other short Redis operations. */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!globalForRedis.myCsecPalRedis) globalForRedis.myCsecPalRedis = createRedisClient();
  const client = globalForRedis.myCsecPalRedis;
  if (client.isReady) return client;

  if (!globalForRedis.myCsecPalRedisConnecting) {
    globalForRedis.myCsecPalRedisConnecting = client.connect().then(() => client).finally(() => {
      globalForRedis.myCsecPalRedisConnecting = undefined;
    });
  }
  return globalForRedis.myCsecPalRedisConnecting;
}
