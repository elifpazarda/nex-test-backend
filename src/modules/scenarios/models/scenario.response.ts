export interface GeneratedScenarioItem {
  id: string;
  title: string;
  category: 'happy_path' | 'edge_case' | 'negative';
  priority: 'critical' | 'high' | 'medium' | 'low';
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

export interface GenerateScenarioResponse {
  scenarios: GeneratedScenarioItem[];
  input: string;
  sourceType: string;
  sourceRef?: string;
}

export interface CodeGenerationItem {
  scenarioId: string;
  framework: string;
  language: string;
  code: string;
}

export interface ConvertBddResponse {
  framework: string;
  results: CodeGenerationItem[];
}

export interface ScenarioResponse {
  id: string;
  title: string;
  input: string;
  rawOutput: string;
  bddOutput: string;
  category: string;
  priority: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  sourceType: string | null;
  sourceRef: string | null;
  projectId: string;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioWithGroup extends ScenarioResponse {
  group: {
    id: string;
    name: string;
    type: string;
  };
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
  group: {
    id: string;
    name: string;
    type: string;
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
