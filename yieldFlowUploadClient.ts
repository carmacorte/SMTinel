export type YieldFlowUploadStatus =
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export interface YieldFlowUploadResponse {
  job_id: string;
  status?: YieldFlowUploadStatus;
  message?: string;
}

export interface YieldFlowStatusResponse {
  job_id: string;
  status: YieldFlowUploadStatus;
  progress: number;
  message?: string;
  result_url?: string;
  error?: string;
}

export interface YieldFlowUploadOptions {
  file: File;
  uploadEndpoint: string;
  statusEndpointBase: string;
  pollIntervalMs?: number;
  onProgress?: (
    progress: number,
    status: YieldFlowUploadStatus,
    message?: string
  ) => void;
}

export interface YieldFlowUploadResult {
  success: boolean;
  jobId?: string;
  resultUrl?: string;
  message?: string;
}

const UPLOAD_PROGRESS_WEIGHT = 0.4;
const PROCESSING_PROGRESS_WEIGHT = 0.55;
const PROCESSING_PROGRESS_OFFSET = 40;
const MAX_PROCESSING_PROGRESS = 95;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uploadZipFile(
  file: File,
  uploadEndpoint: string,
  onProgress?: (progress: number) => void
): Promise<YieldFlowUploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;

      const rawUploadProgress = (event.loaded / event.total) * 100;
      const mappedProgress = normalizeProgress(rawUploadProgress * UPLOAD_PROGRESS_WEIGHT);
      onProgress?.(Math.min(mappedProgress, PROCESSING_PROGRESS_OFFSET));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload failed with status ${xhr.status}`));
        return;
      }

      try {
        const response = JSON.parse(xhr.responseText) as YieldFlowUploadResponse;

        if (!response.job_id) {
          reject(new Error('Upload response does not include job_id.'));
          return;
        }

        resolve(response);
      } catch {
        reject(new Error('Invalid upload response. Expected JSON with job_id.'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed. Please try again.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled.'));
    });

    xhr.open('POST', uploadEndpoint);
    xhr.send(formData);
  });
}

async function readYieldFlowStatus(
  statusEndpointBase: string,
  jobId: string
): Promise<YieldFlowStatusResponse> {
  const response = await fetch(`${statusEndpointBase}/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Status check failed with status ${response.status}`);
  }

  return response.json() as Promise<YieldFlowStatusResponse>;
}

export async function uploadYieldFlowZip({
  file,
  uploadEndpoint,
  statusEndpointBase,
  pollIntervalMs = 1500,
  onProgress,
}: YieldFlowUploadOptions): Promise<YieldFlowUploadResult> {
  if (!file) {
    return {
      success: false,
      message: 'No file selected.',
    };
  }

  const fileName = file.name.toLowerCase();

  if (!fileName.endsWith('.zip')) {
    return {
      success: false,
      message: 'Only ZIP files are supported for Yield Flow upload.',
    };
  }

  try {
    onProgress?.(0, 'uploading', 'Uploading Yield Flow ZIP.');

    const uploadResponse = await uploadZipFile(file, uploadEndpoint, (progress) => {
      onProgress?.(progress, 'uploading', 'Uploading Yield Flow ZIP.');
    });

    const jobId = uploadResponse.job_id;

    onProgress?.(
      PROCESSING_PROGRESS_OFFSET + 5,
      uploadResponse.status || 'queued',
      uploadResponse.message || 'ZIP received. Waiting for processing.'
    );

    while (true) {
      const status = await readYieldFlowStatus(statusEndpointBase, jobId);

      if (status.status === 'failed') {
        return {
          success: false,
          jobId,
          message: status.error || status.message || 'Yield Flow processing failed.',
        };
      }

      if (status.status === 'completed') {
        onProgress?.(
          100,
          'completed',
          status.message || 'Yield Flow processing completed.'
        );

        return {
          success: true,
          jobId,
          resultUrl: status.result_url,
          message: status.message || 'Yield Flow ZIP processed successfully.',
        };
      }

      const serverProgress = normalizeProgress(status.progress || 0);
      const mappedProgress =
        PROCESSING_PROGRESS_OFFSET + Math.round(serverProgress * PROCESSING_PROGRESS_WEIGHT);

      onProgress?.(
        Math.min(mappedProgress, MAX_PROCESSING_PROGRESS),
        status.status,
        status.message || 'Processing Yield Flow ZIP.'
      );

      await wait(pollIntervalMs);
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected Yield Flow upload error.',
    };
  }
}
