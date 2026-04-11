export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
