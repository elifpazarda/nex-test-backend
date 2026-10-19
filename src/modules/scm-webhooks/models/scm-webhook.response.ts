// Baglanti dis gorunumu (secret icermez).
export interface ScmConnectionResponse {
  id: string;
  provider: string;
  label: string | null;
  active: boolean;
  projectId: string | null;
  webhookUrl: string;
  createdAt: Date;
}

// Olusturma yaniti: secret yalnizca bir kez, burada doner.
export interface ScmConnectionCreatedResponse extends ScmConnectionResponse {
  secret: string;
}

// Webhook alindiginda saglayiciya donen minimal onay (ack).
export interface WebhookAckResponse {
  received: boolean;
  eventId: string;
  eventType: string;
}
