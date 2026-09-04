import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: { message, code } },
    { status }
  );
}
