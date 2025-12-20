import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisService } from 'src/modules/redis/domain/services/redis.service';
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
    this.loop().catch((err) => this.logger.error(err));
  }
  onModuleDestroy() {
    this.running = false;
  }

  private async loop() {
    const client = this.redisService.getClient();
    while (this.running) {
      try {
        // BRPOP blocks until a task arrives
        const res = await client.brpop('ready_queue', 0);
        if (!res) continue;
        const taskId = res[1];
        this.logger.log(`Popped task ${taskId}`);

        const task = await this.taskService.findOne(taskId);
        if (!task) {
          this.logger.warn(`Task ${taskId} not found`);
          continue;
        }

        // Execute - send notification (placeholder)
        this.logger.log(
          `Executing task ${taskId} for user ${task.userId}: ${task.message}`,
        );
        // TODO: integrate email/push/sms service here

        // mark done
        await this.taskService.markDone(taskId);
      } catch (err) {
        this.logger.error(err);
        // on error, continue; BRPOP will block again
      }
    }
  }
}
