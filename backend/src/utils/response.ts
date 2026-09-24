import type { Response } from 'express';
import type { ApiSuccess, Pagination } from '../types/api.types.js';

/** 200 `{ success: true, data }` */
export function ok(res: Response, data: unknown): void {
  const body: ApiSuccess<unknown> = { success: true, data };
  res.status(200).json(body);
}

/** 201 `{ success: true, data }` */
export function created(res: Response, data: unknown): void {
  const body: ApiSuccess<unknown> = { success: true, data };
  res.status(201).json(body);
}

/** 200 `{ success: true, data: [...], pagination }` */
export function paginated(res: Response, data: readonly unknown[], pagination: Pagination): void {
  const body: ApiSuccess<readonly unknown[]> = { success: true, data, pagination };
  res.status(200).json(body);
}
