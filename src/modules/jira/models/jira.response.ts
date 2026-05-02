export interface JiraAuthUrlResponse {
  authUrl: string;
}

export interface JiraConnectionResponse {
  siteUrl: string;
  siteName: string;
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
