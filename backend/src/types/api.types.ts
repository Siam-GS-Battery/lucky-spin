export interface FieldError {
  field: string;
  message: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  pagination?: Pagination;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: FieldError[];
}
