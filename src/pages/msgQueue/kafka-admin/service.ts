// @ts-ignore
/* eslint-disable */
import { request } from '@umijs/max';
import type {
  ApiResponse,
  TopicInfo,
  ConsumerGroupSummary,
  ConsumerGroupDetail,
} from './data';

/**
 * 获取所有 Topic 及分区
 */
export async function listKafkaTopics(options?: Record<string, any>) {
  return request<ApiResponse<TopicInfo[]>>('/api/kafka/admin/topics', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取所有消费者组及状态
 */
export async function listKafkaConsumerGroups(options?: Record<string, any>) {
  return request<ApiResponse<ConsumerGroupSummary[]>>('/api/kafka/admin/consumer-groups', {
    method: 'GET',
    ...(options || {}),
  });
}

/**
 * 获取指定消费者组详情（含各分区 offset 与 lag）
 */
export async function getKafkaConsumerGroupDetail(
  groupId: string,
  options?: Record<string, any>,
) {
  return request<ApiResponse<ConsumerGroupDetail>>('/api/kafka/admin/consumer-groups/detail', {
    method: 'GET',
    params: { groupId },
    ...(options || {}),
  });
}
