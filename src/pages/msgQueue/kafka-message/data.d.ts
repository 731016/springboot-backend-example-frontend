// src/pages/admin/kafka-message/data.d.ts

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

export interface KafKaMsg {
  topic: string;
  msg: string;
}

