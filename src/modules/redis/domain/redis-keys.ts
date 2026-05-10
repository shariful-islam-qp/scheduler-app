/** Avoid generic names like `schedule` that may already exist as the wrong Redis type. */
export const REDIS_SCHEDULE_ZSET = 'scheduler:app:due_zset';
export const REDIS_READY_QUEUE = 'scheduler:app:ready_queue';
