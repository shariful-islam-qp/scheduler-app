import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_SCHEDULE_ZSET } from '../redis-keys';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private logger = new Logger(RedisService.name);
  private readonly client: Redis;
  /** Separate TCP connection so BRPOP never blocks ZRANGE/ZADD on the main client. */
  private readonly blockingClient: Redis;

  constructor() {
    this.client = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    });
    this.blockingClient = this.client.duplicate();
  }

  async onModuleDestroy() {
    // Force-close the blocking socket: BRPOP 0 never completes, so quit() would hang
    // forever waiting to flush it. disconnect() drops the socket immediately and the
    // pending BRPOP rejects, letting WorkerService's loop exit on `running = false`.
    this.blockingClient.disconnect();
    await this.client.quit();
  }

  getClient() {
    return this.client;
  }

  /** Use only for blocking commands (BRPOP, BLPOP, …). */
  getBlockingClient(): Redis {
    return this.blockingClient;
  }

  async getSchedule() {
    return this.client.zrange(REDIS_SCHEDULE_ZSET, 0, 0, 'WITHSCORES');
  }

  async addToSchedule(score: number, value: string): Promise<void> {
    this.logger.log(`addToSchedule score=${score} taskId=${value}`);
    await this.client.zadd(REDIS_SCHEDULE_ZSET, score, value);
  }

  getProperty(key: string) {
    return this.client.get(key);
  }

  async removeFromSchedule(value: string) {
    return this.client.zrem(REDIS_SCHEDULE_ZSET, value);
  }

  /** Unix seconds from Redis (same clock Redis uses for key TTL / ordering). */
  async getServerTimeSeconds(): Promise<number> {
    const reply = (await this.client.call('TIME')) as [string, string];
    return Number(reply[0]);
  }
}
