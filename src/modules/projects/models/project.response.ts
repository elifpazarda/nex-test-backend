export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithCount extends ProjectResponse {
  _count: { scenarios: number; scenarioGroups: number };
}
