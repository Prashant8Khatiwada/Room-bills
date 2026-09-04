import { toast } from 'sonner';
import { ApiResponse } from './apiHelpers';

export class ApiError extends Error {
  constructor(public message: string, public code?: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  silent?: boolean;
}

async function request<T>(method: string, url: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  const { silent = false, headers: customHeaders, ...customOpts } = opts || {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const config: RequestInit = {
    method,
    headers,
    ...customOpts,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, config);
    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      const errorMsg = json.error?.message || 'An unexpected error occurred';
      const errorCode = json.error?.code;

      if (!silent) {
        toast.error(errorMsg);
      }

      throw new ApiError(errorMsg, errorCode, res.status);
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const networkError = 'Network connection failure';
    if (!silent) {
      toast.error(networkError);
    }
    throw new ApiError(networkError);
  }
}

export const apiClient = {
  get: <T>(url: string, opts?: RequestOptions) => request<T>('GET', url, undefined, opts),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', url, body, opts),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', url, body, opts),
  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', url, body, opts),
  delete: <T>(url: string, opts?: RequestOptions) => request<T>('DELETE', url, undefined, opts),
};
