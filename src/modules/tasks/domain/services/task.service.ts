import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { RedisService } from 'src/modules/redis/domain/services/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../enums/task-status.enum';
import { parseExecuteAtToUtcDate } from '../parse-execute-at';

@Injectable()
export class TaskService {
  private logger = new Logger(TaskService.name);
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly redisService: RedisService,
  ) {}

  async create(createDto: {
    userId: string;
    message: string;
    executeAt: string;
    timeZone?: string;
  }) {
    const requestedAt = parseExecuteAtToUtcDate(
      createDto.executeAt,
      createDto.timeZone,
    );
    const task = this.taskRepository.create({
      userId: createDto.userId,
      message: createDto.message,
      executeAt: requestedAt,
      status: TaskStatus.PENDING,
    });
    const saved = await this.taskRepository.save(task);
    const persisted = new Date(saved.executeAt);
    const score = Math.floor(persisted.getTime() / 1000);
    if (!Number.isFinite(score)) {
      throw new BadRequestException(
        'executeAt must be a valid date (could not compute schedule time)',
      );
    }
    const redisNow = await this.redisService.getServerTimeSeconds();
    const minLeadSec = 3;
    if (score < redisNow + minLeadSec) {
      const nowIso = new Date(redisNow * 1000).toISOString();
      const behindSec = redisNow - score;
      throw new BadRequestException(
        `executeAt is already in the past relative to the server clock. ` +
          `Redis now ≈ ${nowIso} (epoch ${redisNow}), but you asked for ${persisted.toISOString()} (epoch ${score}) — about ${Math.round(behindSec / 60)} minutes earlier. ` +
          `If you meant local wall time (e.g. 3:53 PM), send no Z on executeAt and add timeZone, e.g. ` +
          `{"executeAt":"2026-05-10T15:53:00","timeZone":"Asia/Dhaka"}. ` +
          `Otherwise use UTC with hour 15 for 3 PM, e.g. 2026-05-10T15:53:00.000Z. ` +
          `Pick a time strictly after ${nowIso} (plus ${minLeadSec}s).`,
      );
    }
    if (Math.abs(persisted.getTime() - requestedAt.getTime()) > 2000) {
      this.logger.warn(
        `executeAt changed after DB save by ${(persisted.getTime() - requestedAt.getTime()) / 1000}s — using persisted value for Redis`,
      );
    }
    await this.redisService.addToSchedule(score, saved.id);
    this.logger.log(
      `Task ${saved.id} scheduled at epoch ${score} (executeAt=${persisted.toISOString()})`,
    );
    return saved;
  }

  async markDone(id: string) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      this.logger.error(`markDone: no row for id=${id}`);
      throw new NotFoundException(`Task ${id} not found`);
    }
    task.status = TaskStatus.DONE;
    await this.taskRepository.save(task);
    this.logger.log(`Task ${id} marked DONE`);
  }

  async findOne(id: string) {
    return this.taskRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find({ order: { createdAt: 'DESC' } });
  }

  async removeAll(): Promise<void> {
    await this.taskRepository.clear();
  }
}
