import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ExportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
  JSON = 'json',
  FEATURE = 'feature',
}

export class ExportQueryRequest {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  minScore?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  xrayFormat?: boolean;
}

export class GenerateScenarioRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  input: string;
}

export class GenerateFromJiraRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  issueKey: string;
}

export class ImportExcelRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @Transform(({ value }) => String(value).toLowerCase() === 'true' || value === true)
  saveResults?: boolean;

  @IsOptional()
  @Transform(({ value }) => String(value).toLowerCase() === 'true' || value === true)
  evaluateQuality?: boolean;
}

export class SaveScenarioRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsNotEmpty()
  rawOutput: string;

  @IsString()
  @IsNotEmpty()
  bddOutput: string;

  @IsNumber()
  qualityScore: number;

  @IsString()
  @IsOptional()
  qualityFeedback?: string;

  @IsString()
  @IsOptional()
  sourceType?: string;

  @IsString()
  @IsOptional()
  sourceRef?: string;
}
