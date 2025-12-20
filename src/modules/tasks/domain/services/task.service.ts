import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { RedisService } from 'src/modules/redis/domain/services/redis.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatus } from '../enums/task-status.enum';

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
  }) {
    const task = this.taskRepository.create({
      userId: createDto.userId,
      message: createDto.message,
      executeAt: new Date(createDto.executeAt),
      status: TaskStatus.PENDING,
    });
    const saved = await this.taskRepository.save(task);
    console.log('saved', saved);

    // Add to schedule ZSET with score as epoch seconds
    const client = this.redisService.getClient();
    const score = Math.floor(new Date(saved.executeAt).getTime() / 1000);
    this.logger.log('score from task service', score.toString());
    this.logger.log('saved.id from task service', saved.id);
    await client.zadd('schedule', score.toString());
    this.logger.log('tasks', client.get('schedule'));
    return saved;
  }

  async markDone(id: string) {
    this.logger.log(`Marking task ${id} as done`);
    const result = await this.taskRepository.update(id, {
      status: TaskStatus.DONE,
    });

    if (result.affected === 0) {
      this.logger.error(`Failed to mark task ${id} as done`);
      throw new NotFoundException(`Task ${id} not found`);
    }
  }

  async findOne(id: string) {
    return this.taskRepository.findOneBy({ id });
  }

  async findAll(): Promise<Task[]> {
    return this.taskRepository.find();
  }

  async removeAll(): Promise<void> {
    await this.taskRepository.clear();
  }
}
