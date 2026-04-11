import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class GenerateScenarioDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  input: string;
}

export class SaveScenarioDto {
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
}
