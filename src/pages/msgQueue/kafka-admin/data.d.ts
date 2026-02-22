export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface TopicPartitionInfo {
  partition: number;
  leaderId: number;
}

export interface TopicInfo {
  topic: string;
  partitionCount: number;
  partitions: TopicPartitionInfo[];
}

export interface MemberInfo {
  consumerId: string;
  host: string;
  assignedPartitions: number;
}

export interface ConsumerGroupSummary {
  groupId: string;
  state: string;
  memberCount: number;
  members: MemberInfo[];
}

export interface PartitionOffsetInfo {
  topic: string;
  partition: number;
  currentOffset: number;
  endOffset: number;
  lag: number;
}

export interface ConsumerGroupDetail {
  groupId: string;
  state: string;
  members: MemberInfo[];
  partitionOffsets: PartitionOffsetInfo[];
  totalLag: number;
}
