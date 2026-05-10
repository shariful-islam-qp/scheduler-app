import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'src/modules/redis/domain/services/redis.service';
import { REDIS_READY_QUEUE } from 'src/modules/redis/domain/redis-keys';
import { TaskService } from './task.service';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private running = true;
  private logger = new Logger(WorkerService.name);
  constructor(
    private readonly redisService: RedisService,
    private readonly taskService: TaskService,
  ) {}

  onModuleInit() {
    this.logger.log('Worker Service initialized **********');
    this.loop().catch((err) => this.logger.error(err));
  }

  onModuleDestroy() {
    this.running = false;
    this.logger.log('Worker Service destroyed **********');
  }

  private async loop() {
    const blocking = this.redisService.getBlockingClient();
    while (this.running) {
      try {
        // Must use a dedicated connection; BRPOP on the same client as ZADD/ZRANGE deadlocks the app.
        const res = await blocking.brpop(REDIS_READY_QUEUE, 0);
        this.logger.log('res', res);
        if (!res) continue;
        const taskId = res[1];
        this.logger.log(`Popped task ${taskId} from ready_queue`);

        const task = await this.taskService.findOne(taskId);
        if (!task) {
          this.logger.warn(
            `No DB row for id=${taskId} (stale Redis member). Check zset scheduler:app:due_zset and list scheduler:app:ready_queue.`,
          );
          continue;
        }

        // Execute - send notification (placeholder)
        this.logger.log(
          `Executing task ${taskId} for user ${task.userId}: ${task.message}`,
        );
        // TODO: integrate email/push/sms service here

        await this.taskService.markDone(taskId);
      } catch (err) {
        const msg =
          err instanceof Error ? (err.stack ?? err.message) : String(err);
        this.logger.error(`Worker error: ${msg}`);
        // on error, continue; BRPOP will block again
      }
    }
  }
}
