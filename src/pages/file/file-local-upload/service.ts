import {request} from "@umijs/max";
import {UploadFileResult} from "@/pages/file/file-local-upload/data";

export async function uploadToLocal(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<UploadFileResult>('/api/file/uploadToLocal', {
    data,
    method: 'POST',
    ...(options || {}),
  });
}
