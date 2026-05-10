import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from "@nestjs/common";
import { RedisService } from "src/modules/redis/domain/services/redis.service";

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
	private logger = new Logger(SchedulerService.name);
	private running = true;
	constructor(private readonly redisService: RedisService) {}

	onModuleInit(): void {
		this.logger.log("Scheduler module initialized **********");
		this.loop().catch((err) => this.logger.error(err));
	}

	onModuleDestroy(): void {
		this.running = false;
		this.logger.log("Scheduler module destroyed #################### ");
	}

	private async loop() {
		const client = this.redisService.getClient();
		while (true) {
			const res = await client.zrange("schedule", 0, 0, "WITHSCORES");
			this.logger.log("res", res);
			if (!res.length) {
				await sleep(1000);
				continue;
			}
			const [id, scoreStr] = res;
			const score = parseInt(scoreStr, 10);
			const now = Math.floor(Date.now() / 1000);
			this.logger.log("now", now.toString());
			this.logger.log("score", score.toString());
			if (score > now) {
				await sleep(Math.min((score - now) * 1000, 5000));
				continue;
			}
			const popped = await client.zpopmin("schedule");
			if (!popped.length) continue;
			await client.lpush("ready_queue", popped[0]);
			this.logger.log(`Moved task ${popped[0]} to ready_queue`);
		}
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
