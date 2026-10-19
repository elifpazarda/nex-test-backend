import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// SCM webhook baglantisi olusturma istegi (JWT korumali management endpoint).
export class CreateScmConnectionRequest {
  @IsIn(['github'])
  provider: string = 'github';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  // Opsiyonel: baglantiyi bir projeye bagla (sahiplik dogrulanir).
  @IsOptional()
  @IsString()
  projectId?: string;

  // Uygun event'lerde (issues/pull_request opened|edited) otomatik senaryo uret.
  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

  // autoGenerate acikken zorunlu: uretilen senaryolarin yazilacagi grup.
  @IsOptional()
  @IsString()
  targetGroupId?: string;
}

// GitHub webhook payload'u genis ve event'e gore degiskendir; yalnizca
// kullandigimiz alanlari tiplendiriyoruz. Govde dogrulamasi class-validator ile
// degil, imza guard'inda (HMAC) yapilir — bu yuzden burada decorator yok.
export interface GithubRepository {
  full_name?: string;
  html_url?: string;
}

export interface GithubIssue {
  number?: number;
  title?: string;
  body?: string | null;
}

export interface GithubPullRequest {
  number?: number;
  title?: string;
  body?: string | null;
}

export interface GithubWebhookPayload {
  action?: string;
  repository?: GithubRepository;
  issue?: GithubIssue;
  pull_request?: GithubPullRequest;
  [key: string]: unknown;
}
