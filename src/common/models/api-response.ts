export interface ApiResponse<T> {
  success: boolean;
  timestamp: string;
  path: string;
  data: T;
}
