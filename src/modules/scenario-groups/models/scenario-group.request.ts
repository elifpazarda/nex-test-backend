import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ScenarioGroupType } from '@prisma/client';

export class CreateScenarioGroupRequest {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEnum(ScenarioGroupType)
  type: ScenarioGroupType;

  @IsString()
  @IsNotEmpty()
  projectId: string;
}

export class UpdateScenarioGroupRequest {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsEnum(ScenarioGroupType)
  @IsOptional()
  type?: ScenarioGroupType;
}
