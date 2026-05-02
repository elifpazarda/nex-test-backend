import { ScenarioGroupType } from '@prisma/client';

export interface ScenarioGroupResponse {
  id: string;
  name: string;
  type: ScenarioGroupType;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioGroupWithCount extends ScenarioGroupResponse {
  _count: { scenarios: number };
}
