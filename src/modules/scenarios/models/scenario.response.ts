export interface GenerateScenarioResponse {
  rawOutput: string;
  bddOutput: string;
  qualityScore: number;
  qualityFeedback: string;
}

export interface ScenarioResponse {
  id: string;
  title: string;
  input: string;
  rawOutput: string;
  bddOutput: string;
  qualityScore: number;
  qualityFeedback: string;
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
