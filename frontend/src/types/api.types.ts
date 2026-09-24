/** Field-level validation error returned by the backend (Zod). */
export interface FieldError {
  field: string;
  message: string;
}

/** SOP success envelope. */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** SOP error envelope. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
