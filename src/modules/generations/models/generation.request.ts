import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationQuery } from '../../../common/models/pagination';

export const GENERATION_SOURCE_TYPES = [
  'text',
  'jira',
  'excel',
  'pdf',
] as const;

export type GenerationSourceType = (typeof GENERATION_SOURCE_TYPES)[number];

export class GenerationListQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  @IsIn(GENERATION_SOURCE_TYPES)
  sourceType?: GenerationSourceType;

  @IsOptional()
  @IsString()
  search?: string;
}
