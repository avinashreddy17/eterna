import { Queue } from 'bullmq';
import { redis } from './redis';

export const ORDER_QUEUE_NAME = 'order-execution';

export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
  connection: redis
});

