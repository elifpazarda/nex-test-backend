import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQuery } from '../../../common/models/pagination';

export const SCM_EVENT_STATUSES = [
  'RECEIVED',
  'PROCESSED',
  'SKIPPED',
  'FAILED',
] as const;

export type ScmEventStatus = (typeof SCM_EVENT_STATUSES)[number];

// Webhook event gecmisi listeleme sorgusu (pagination + status/eventType filtresi).
export class ScmWebhookEventListQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @IsIn(SCM_EVENT_STATUSES)
  status?: ScmEventStatus;

  @IsOptional()
  @IsString()
  eventType?: string;
}

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

// Baglanti ayarlarini guncelleme (PATCH). Tum alanlar opsiyonel; verilenler uygulanir.
// autoGenerate'in nihai degeri true ise targetGroupId (nihai) dolu olmalidir.
export class UpdateScmConnectionRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  autoGenerate?: boolean;

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

export interface GithubRef {
  ref?: string;
}

export interface GithubPullRequest {
  number?: number;
  title?: string;
  body?: string | null;
  // Payload'da bulunan degisiklik metadata'si (dosya adlari payload'da YOK —
  // onun icin GitHub API cagrisi/token gerekir).
  changed_files?: number;
  additions?: number;
  deletions?: number;
  commits?: number;
  head?: GithubRef;
  base?: GithubRef;
}

export interface GithubWebhookPayload {
  action?: string;
  repository?: GithubRepository;
  issue?: GithubIssue;
  pull_request?: GithubPullRequest;
  [key: string]: unknown;
}
