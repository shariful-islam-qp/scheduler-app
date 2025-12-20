import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [DatabaseModule, RedisModule, TasksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
