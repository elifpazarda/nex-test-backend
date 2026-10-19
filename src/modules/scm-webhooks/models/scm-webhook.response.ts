// Baglanti dis gorunumu (secret icermez).
export interface ScmConnectionResponse {
  id: string;
  provider: string;
  label: string | null;
  active: boolean;
  autoGenerate: boolean;
  targetGroupId: string | null;
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

// Kaydedilmis bir webhook event'inin liste gorunumu (payload haric).
export interface ScmWebhookEventResponse {
  id: string;
  provider: string;
  eventType: string;
  action: string | null;
  deliveryId: string | null;
  sourceRef: string | null;
  status: string;
  error: string | null;
  createdAt: Date;
}
