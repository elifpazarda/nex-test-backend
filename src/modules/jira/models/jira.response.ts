export interface JiraConnectionResponse {
  baseUrl: string;
  email: string;
  connectedAt: string;
  updatedAt: string;
}

export interface JiraIssueResponse {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  url: string;
}
