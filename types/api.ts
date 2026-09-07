export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AppError = {
  message: string;
  statusCode?: number;
  code?: string;
  raw?: unknown;
};
