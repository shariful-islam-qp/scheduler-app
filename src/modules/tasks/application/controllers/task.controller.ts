import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { TaskService } from '../../domain/services/task.service';
import { CreateTaskDto } from '../dtos/create-task.dto';
import { Task } from '../../domain/entities/task.entity';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(): Promise<Task[]> {
    return this.taskService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Delete()
  async removeAll(): Promise<void> {
    return this.taskService.removeAll();
  }
}
