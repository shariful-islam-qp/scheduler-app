import { Module } from '@nestjs/common';
import { TaskService } from './domain/services/task.service';
import { TaskController } from './application/controllers/task.controller';
import { SchedulerService } from './domain/services/scheduler.service';
import { WorkerService } from './domain/services/worker.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './domain/entities/task.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), RedisModule],
  providers: [TaskService, SchedulerService, WorkerService],
  controllers: [TaskController],
})
export class TasksModule {}
