import axios from 'axios';

export const RESUMABLE_THRESHOLD_BYTES = 10 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createUploadControl = () => ({
  paused: false,
  canceled: false,
});

export const pauseUpload = (control) => {
  if (control) control.paused = true;
};

export const resumeUpload = (control) => {
  if (control) control.paused = false;
};

export const cancelUpload = (control) => {
  if (control) control.canceled = true;
};

export const uploadFileResumable = async ({
  file,
  token,
  relativePath = '',
  companyId = null,
  fieldSlot = 'other',
  answerId = null,
  actionPlanId = null,
  uploadControl = null,
  onProgress = () => {},
  maxRetries = 4,
}) => {
  if (!file) throw new Error('Arquivo nao informado');

  const initResponse = await axios.post(
    '/api/uploads/init/',
    {
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || 'application/octet-stream',
      relative_path: relativePath,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const { upload_id: uploadId, chunk_size: recommendedChunkSize } = initResponse.data;
  const chunkSize = recommendedChunkSize || DEFAULT_CHUNK_SIZE;
  let bytesSent = 0;
  const startedAt = Date.now();

  while (bytesSent < file.size) {
    if (uploadControl?.canceled) {
      throw new Error('Upload cancelado pelo usuario');
    }
    while (uploadControl?.paused) {
      await sleep(200);
      if (uploadControl?.canceled) {
        throw new Error('Upload cancelado pelo usuario');
      }
    }

    const chunk = file.slice(bytesSent, bytesSent + chunkSize);
    const chunkEnd = bytesSent + chunk.size - 1;
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('start', String(bytesSent));
    formData.append('end', String(chunkEnd));
    formData.append('total', String(file.size));

    let attempt = 0;
    // Retry exponencial por chunk para suportar redes instaveis.
    while (true) {
      try {
        const chunkResponse = await axios.put(`/api/uploads/${uploadId}/chunk/`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        bytesSent = chunkResponse.data.bytes_sent;
        break;
      } catch (error) {
        attempt += 1;
        if (attempt > maxRetries) throw error;
        await sleep(Math.min(8000, 400 * 2 ** (attempt - 1)));
      }
    }

    const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
    const speed = bytesSent / elapsedSeconds;
    const etaSeconds = Math.max(0, Math.round((file.size - bytesSent) / Math.max(1, speed)));
    const percent = Math.min(100, Math.round((bytesSent / file.size) * 100));
    onProgress({ percent, bytesSent, totalBytes: file.size, etaSeconds });
  }

  const completeResponse = await axios.post(
    `/api/uploads/${uploadId}/complete/`,
    {
      company_id: companyId,
      answer_id: answerId,
      action_plan_id: actionPlanId,
      field_slot: fieldSlot,
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return completeResponse.data;
};
