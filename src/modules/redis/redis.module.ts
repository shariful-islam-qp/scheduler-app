import { Module } from '@nestjs/common';
import { RedisService } from './domain/services/redis.service';

@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
