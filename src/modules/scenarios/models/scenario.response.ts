export interface GenerateScenarioResponse {
  rawOutput: string;
  input: string;
  sourceType: string;
  sourceRef?: string;
}

export interface ConvertBddResponse {
  bddOutput: string;
}

export interface ScenarioResponse {
  id: string;
  title: string;
  input: string;
  rawOutput: string;
  bddOutput: string;
  sourceType: string | null;
  sourceRef: string | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioWithProject extends ScenarioResponse {
  project: {
    id: string;
    name: string;
    description: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface ExcelRowData {
  rowNumber: number;
  issueKey: string;
  testSummary: string;
  testType: string;
  action: string;
  data: string;
  result: string;
  description: string;
}

export interface ExcelImportResultItem {
  rowNumber: number;
  issueKey: string;
  testSummary: string;
  input: string;
  bddOutput: string;
  savedId?: string;
  error?: string;
}

export interface ExcelImportResponse {
  totalRows: number;
  successCount: number;
  failureCount: number;
  results: ExcelImportResultItem[];
}
