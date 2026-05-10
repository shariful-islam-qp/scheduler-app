import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'src/modules/redis/domain/services/redis.service';
import {
  REDIS_READY_QUEUE,
  REDIS_SCHEDULE_ZSET,
} from 'src/modules/redis/domain/redis-keys';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(SchedulerService.name);
  private running = true;
  constructor(private readonly redisService: RedisService) {}

  onModuleInit(): void {
    this.logger.log('Scheduler module initialized **********');
    this.loop().catch((err) => this.logger.error(err));
  }

  onModuleDestroy(): void {
    this.running = false;
    this.logger.log('Scheduler module destroyed #################### ');
  }

  // private async loop(): Promise<void> {
  //   const client = this.redisService.getClient();
  //   this.logger.log('Scheduler loop started');
  //   while (this.running) {
  //     // Peek earliest
  //     const res = await client.zrange('schedule', 0, 0, 'WITHSCORES');
  //     console.log('res', res);
  //     if (!res || res.length === 0) {
  //       this.logger.log('No tasks scheduled, sleeping for 1 second');
  //       // nothing scheduled, sleep a bit
  //       await sleep(1000);
  //       continue;
  //     }
  //     // const id = res[0];
  //     const score = parseInt(res[1], 10);
  //     const now = Math.floor(Date.now() / 1000);
  //     const diff = score - now;
  //     if (diff > 0) {
  //       // sleep until due (cap to avoid long sleep)
  //       const waitMs = Math.min(diff * 1000, 5000);
  //       await sleep(waitMs);
  //       continue;
  //     }

  //     // It's due: atomically pop the min and push to ready_queue
  //     // Use ZPOPMIN (Redis >= 5.0). If not available, use transaction
  //     const popped = await client.zpopmin('schedule');
  //     if (!popped || popped.length === 0) {
  //       continue;
  //     }
  //     // zpopmin returns [member, score]
  //     const taskId = popped[0];
  //     // push to ready queue
  //     await client.lpush('ready_queue', taskId);
  //     this.logger.log(`Moved task ${taskId} to ready_queue`);
  //   }
  // }

  // private async loop(): Promise<void> {
  //   const client = this.redisService.getClient();
  //   this.logger.log('Scheduler loop started');

  //   while (this.running) {
  //     // Peek earliest
  //     const res = await client.zrange('schedule', 0, 0, 'WITHSCORES');
  //     if (!res || res.length === 0) {
  //       this.logger.log('No tasks scheduled, sleeping 1s');
  //       await sleep(1000);
  //       continue;
  //     }

  //     // const taskId = res[0];
  //     const score = parseInt(res[1], 10);
  //     const now = Math.floor(Date.now() / 1000);

  //     if (score > now) {
  //       const waitMs = Math.min((score - now) * 1000, 5000);
  //       await sleep(waitMs);
  //       continue;
  //     }

  //     // Only pop if still due
  //     // Use WATCH/MULTI/EXEC to make atomic if needed, but Redis 5+ supports zpopmin
  //     const popped = await client.zpopmin('schedule', 1); // pop 1 min element
  //     if (!popped || popped.length === 0) {
  //       continue;
  //     }

  //     const poppedTaskId = popped[0]; // actual task id
  //     this.logger.log(`Popping task ${poppedTaskId} to ready_queue`);
  //     await client.lpush('ready_queue', poppedTaskId);
  //   }
  // }

  private async loop() {
    const client = this.redisService.getClient();
    this.logger.log(
      `Scheduler loop started (zset=${REDIS_SCHEDULE_ZSET}, queue=${REDIS_READY_QUEUE})`,
    );
    while (this.running) {
      try {
        const res = await client.zrange(
          REDIS_SCHEDULE_ZSET,
          0,
          0,
          'WITHSCORES',
        );
        if (!res.length) {
          await sleep(1000);
          continue;
        }
        // WITHSCORES order: [member, score, ...]
        const score = Number(res[1]);
        if (!Number.isFinite(score)) {
          this.logger.error(
            `Invalid score in ${REDIS_SCHEDULE_ZSET} member=${res[0]} raw=${res[1]} — removing member`,
          );
          await client.zrem(REDIS_SCHEDULE_ZSET, res[0]);
          continue;
        }
        const now = await this.redisService.getServerTimeSeconds();
        if (score > now) {
          await sleep(Math.min((score - now) * 1000, 5000));
          continue;
        }
        const popped = await client.zpopmin(REDIS_SCHEDULE_ZSET);
        if (!popped.length) continue;
        await client.lpush(REDIS_READY_QUEUE, popped[0]);
        this.logger.log(`Moved task ${popped[0]} to ${REDIS_READY_QUEUE}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(
          `Scheduler error (loop keeps running): ${msg}. If you used an old app version, run: redis-cli DEL schedule`,
        );
        await sleep(2000);
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
