import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
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

export class GenerateFromTextRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  input: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class GenerateFromJiraRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  issueKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class GenerateFromFileRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class ImportExcelRequest {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsOptional()
  @Transform(
    ({ value }) => String(value).toLowerCase() === 'true' || value === true,
  )
  saveResults?: boolean;
}

export class ScenarioItemInput {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsString()
  preconditions: string;

  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @IsString()
  @IsNotEmpty()
  expectedResult: string;
}

export enum TestFramework {
  CUCUMBER = 'cucumber',
  PLAYWRIGHT = 'playwright',
  CYPRESS = 'cypress',
}

export class ConvertBddRequest {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @IsEnum(TestFramework)
  framework?: TestFramework = TestFramework.CUCUMBER;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScenarioItemInput)
  scenarios: ScenarioItemInput[];
}

export class SaveScenarioItemInput {
  @IsString()
  @MinLength(2)
  title: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsString()
  preconditions: string;

  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @IsString()
  @IsNotEmpty()
  expectedResult: string;

  @IsOptional()
  bdd?: {
    framework: string;
    language: string;
    code: string;
  };
}

export class SaveScenariosRequest {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsString()
  @IsNotEmpty()
  input: string;

  @IsString()
  @IsOptional()
  sourceType?: string;

  @IsString()
  @IsOptional()
  sourceRef?: string;

  // Uretim calistirmasinin kimligi (generate response'undan gelir). Verilirse
  // korunan senaryo sayisi ilgili run'a islenir (onay orani hesabi).
  @IsString()
  @IsOptional()
  generationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveScenarioItemInput)
  scenarios: SaveScenarioItemInput[];
}
