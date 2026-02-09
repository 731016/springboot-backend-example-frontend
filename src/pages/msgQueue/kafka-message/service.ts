// src/pages/admin/kafka-message/service.ts
// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type { ApiResponse, KafKaMsg } from './data';

/**
 * 手动发送 Kafka 消息
 * POST /kafka/kafkaMessage/sendMsg
 */
export async function sendKafkaMsg(
  data: KafKaMsg,
  options?: Record<string, any>,
) {
  return request<ApiResponse<string>>('/api/kafka/kafkaMessage/sendMsg', {
    method: 'POST',
    data,
    ...(options || {}),
  });
}

