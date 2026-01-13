import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

export interface JobCreateRequest {
    filename: string;
    content_type: string;
    size_bytes: number;
}

export interface JobResponse {
    job_id: string;
    upload_url: string;
    status: string;
    created_at: string;
}

export async function createJob(
    request: JobCreateRequest,
): Promise<JobResponse> {
    const response = await axios.post<JobResponse>(
        `${API_BASE}/v1/jobs`,
        request,
    );
    return response.data;
}

export async function uploadToGCS(
    url: string,
    file: File,
    onProgress?: (percent: number) => void,
): Promise<void> {
    await axios.put(url, file, {
        headers: {
            "Content-Type": file.type,
        },
        onUploadProgress: (event) => {
            if (event.total && onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                onProgress(percent);
            }
        },
    });
}

export async function getJobStatus(
    jobId: string,
): Promise<Record<string, unknown>> {
    const response = await axios.get(`${API_BASE}/v1/jobs/${jobId}`);
    return response.data;
}
