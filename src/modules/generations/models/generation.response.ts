export type GenerationStatusValue = 'SUCCESS' | 'WARNING' | 'FAILED';

export interface GenerationResponse {
  id: string;
  title: string;
  sourceType: string;
  sourceRef: string | null;
  scenarioCount: number;
  savedCount: number;
  durationMs: number;
  durationSec: number;
  status: GenerationStatusValue;
  project: { id: string; name: string };
  createdAt: Date;
}

export interface GenerationStatsResponse {
  // Bu hafta (son 7 gun) uretilen senaryo sayisi ve gecen haftaya gore degisim
  weekly: {
    scenarioCount: number;
    changePercent: number;
  };
  // Onay orani: uretilen senaryolardan kac tanesi kaydedildi (korundu)
  approval: {
    rate: number;
    saved: number;
    total: number;
  };
  // Bugun: calistirma sayisi, uretilen senaryo, ortalama sure
  today: {
    runCount: number;
    scenarioCount: number;
    avgDurationSec: number;
  };
  // Basari orani: son 7 gunde basarili calistirma / toplam calistirma
  success: {
    rate: number;
    successful: number;
    total: number;
  };
}
