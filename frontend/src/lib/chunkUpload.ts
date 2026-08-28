import axios, { AxiosProgressEvent } from "axios";
import { getApiBaseUrl } from "./api";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

interface ChunkUploadOptions {
  file: File;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface ChunkUploadResult {
  transcript: string;
  filename: string;
  media_type: string;
  provider_used: string;
  fallback_applied: boolean;
}

export async function uploadFileInChunks({
  file,
  onProgress,
  signal,
}: ChunkUploadOptions): Promise<ChunkUploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";

  // For small files (< 6MB) or text files, send direct to fast upload endpoint
  if (file.size < 6 * 1024 * 1024 || ext === "txt") {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(`${getApiBaseUrl()}/api/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(Math.min(percent, 90));
        }
      },
    });

    if (onProgress) onProgress(100);
    return res.data;
  }

  // 1. Initialize Chunked Upload
  const initRes = await axios.post(
    `${getApiBaseUrl()}/api/uploads/init`,
    {
      filename: file.name,
      filesize: file.size,
      media_type: ext,
      total_chunks: totalChunks,
    },
    { signal }
  );

  const uploadId = initRes.data.upload_id;

  try {
    // 2. Upload chunks sequentially with retry
    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) {
        throw new Error("Upload aborted by user.");
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        try {
          await axios.put(
            `${getApiBaseUrl()}/api/uploads/${uploadId}/chunks/${i}`,
            chunkBlob,
            {
              headers: { "Content-Type": "application/octet-stream" },
              signal,
            }
          );
          success = true;
        } catch (err) {
          attempts++;
          if (attempts >= 3) throw err;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (onProgress) {
        const percent = Math.round(((i + 1) / totalChunks) * 90);
        onProgress(percent);
      }
    }

    // 3. Complete and Transcribe
    const completeRes = await axios.post(
      `${getApiBaseUrl()}/api/uploads/${uploadId}/complete`,
      {},
      { signal }
    );

    if (onProgress) onProgress(100);
    return completeRes.data;
  } catch (err) {
    // Clean up on server if aborted or failed
    try {
      await axios.delete(`${getApiBaseUrl()}/api/uploads/${uploadId}`);
    } catch {}
    throw err;
  }
}
