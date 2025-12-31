import {request} from "@umijs/max";
import {UploadFileResult} from "@/pages/file/file-remote-upload/data";

export async function uploadToRemote(
  data: { [key: string]: any },
  options?: { [key: string]: any },
) {
  return request<UploadFileResult>('/api/file/uploadToRemote', {
    data,
    method: 'POST',
    ...(options || {}),
  });
}
