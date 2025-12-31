export type FileTableListItem = {
  key: string;
  userAvatar: string;
  etag: string;
  fileSize: number;
  storageClasses: string;
  lastModified: Date;
  fileType: string;
  path: string;
  tags: Tag[];
};

export type FileTableListPagination = {
  total: number;
  pageSize: number;
  current: number;
};

export type TableListParams = {
  status?: string;
  name?: string;
  desc?: string;
  key?: number;
  pageSize?: number;
  currentPage?: number;
  filter?: Record<string, any[]>;
  sorter?: Record<string, any>;
};

export type FileTableListData = {
  files: FileTableListItem[];
  currentMarker: string;
  nextMarker: string;
  total: number;
  hasNext: number;
  // pagination: Partial<FileTableListPagination>;
};

export type PageFileRequest = {
  preFix: string;
  maxKeys: 1000;
  nextMarker: string;
}

export type Tag = {
  key: string;
  value: string;
}
