/* eslint-disable */
// Demo/sunum icin veritabanini hazir senaryolarla doldurur.
// Calistir: npm run seed
//
// Amac: demo sirasinda uygulama acildiginda zaten dolu gorunsun, gezinme
// aninda hizli olsun. Boylece sadece TEK bir "canli uretim" akisi (AI_MODEL=haiku
// ile hizlandirilmis) wow efekti icin birakilabilir.
import 'dotenv/config';
import { PrismaClient, ScenarioGroupType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DEMO_USER = {
  name: 'Demo Kullanici',
  email: 'demo@nextest.io',
  password: 'Demo1234!',
};

interface SeedScenario {
  title: string;
  category: 'happy_path' | 'edge_case' | 'negative';
  priority: 'critical' | 'high' | 'medium' | 'low';
  preconditions: string;
  steps: string[];
  expectedResult: string;
}

interface SeedGroup {
  name: string;
  type: ScenarioGroupType;
  input: string;
  scenarios: SeedScenario[];
}

interface SeedProject {
  name: string;
  description: string;
  groups: SeedGroup[];
}

const ECOMMERCE_GROUPS: SeedGroup[] = [
  {
    name: 'Kullanici Girisi',
    type: ScenarioGroupType.SMOKE,
    input:
      'Kullanici email ve sifre ile giris yapar. Hatali bilgide hata mesaji gosterilir, 5 basarisiz denemeden sonra hesap 15 dakika kilitlenir.',
    scenarios: [
      {
        title: 'Gecerli bilgilerle basarili giris',
        category: 'happy_path',
        priority: 'critical',
        preconditions: 'Kayitli ve aktif bir kullanici hesabi mevcut.',
        steps: [
          'Giris sayfasini ac',
          'Gecerli email adresini gir',
          'Dogru sifreyi gir',
          '"Giris Yap" butonuna tikla',
        ],
        expectedResult:
          'Kullanici dashboard sayfasina yonlendirilir ve oturum acilir.',
      },
      {
        title: 'Hatali sifre ile giris denemesi',
        category: 'negative',
        priority: 'high',
        preconditions: 'Kayitli bir kullanici hesabi mevcut.',
        steps: [
          'Giris sayfasini ac',
          'Gecerli email adresini gir',
          'Yanlis bir sifre gir',
          '"Giris Yap" butonuna tikla',
        ],
        expectedResult:
          '"Email veya sifre hatali" mesaji gosterilir, oturum acilmaz.',
      },
      {
        title: '5 basarisiz denemeden sonra hesap kilitlenir',
        category: 'edge_case',
        priority: 'high',
        preconditions: 'Kayitli bir kullanici hesabi mevcut.',
        steps: [
          'Yanlis sifre ile 5 kez giris dene',
          '6. kez dogru sifre ile giris dene',
        ],
        expectedResult:
          'Hesabin 15 dakika kilitlendigine dair mesaj gosterilir, dogru sifre bile kabul edilmez.',
      },
    ],
  },
  {
    name: 'Sepet Yonetimi',
    type: ScenarioGroupType.FEATURE,
    input:
      'Kullanici urunu sepete ekler, adet gunceller ve sepetten cikarir. Sepet tutari otomatik hesaplanir, stok yetersizse uyari verilir.',
    scenarios: [
      {
        title: 'Urunu sepete ekleme ve tutar hesaplama',
        category: 'happy_path',
        priority: 'critical',
        preconditions: 'Stokta urun bulunan bir katalog mevcut.',
        steps: [
          'Bir urun detay sayfasini ac',
          '"Sepete Ekle" butonuna tikla',
          'Sepet sayfasini ac',
        ],
        expectedResult:
          'Urun sepette gorunur ve sepet tutari urun fiyatiyla esit hesaplanir.',
      },
      {
        title: 'Sepette urun adetini guncelleme',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Sepette en az bir urun bulunuyor.',
        steps: [
          'Sepet sayfasini ac',
          'Bir urunun adetini 1 -> 3 olarak guncelle',
        ],
        expectedResult:
          'Ara toplam ve genel toplam yeni adete gore otomatik guncellenir.',
      },
      {
        title: 'Stok ustunde adet secimi engellenir',
        category: 'edge_case',
        priority: 'medium',
        preconditions: 'Stogu 2 adet olan bir urun sepette bulunuyor.',
        steps: ['Sepette urun adetini 5 yapmayi dene'],
        expectedResult:
          'Adet stok limitiyle (2) sinirlandirilir ve "Yetersiz stok" uyarisi gosterilir.',
      },
    ],
  },
  {
    name: 'Odeme Akisi',
    type: ScenarioGroupType.E2E,
    input:
      'Kullanici sepetten odeme adimina gecer, teslimat ve kart bilgilerini girer, siparisi tamamlar. Gecersiz kartta odeme reddedilir.',
    scenarios: [
      {
        title: 'Kredi karti ile basarili odeme',
        category: 'happy_path',
        priority: 'critical',
        preconditions: 'Sepette en az bir urun var ve kullanici giris yapmis.',
        steps: [
          'Sepetten "Odemeye Gec" butonuna tikla',
          'Teslimat adresini gir',
          'Gecerli kredi karti bilgilerini gir',
          '"Siparisi Tamamla" butonuna tikla',
        ],
        expectedResult:
          'Siparis olusturulur, siparis numarasi gosterilir ve onay emaili gonderilir.',
      },
      {
        title: 'Gecersiz kart numarasi ile odeme reddedilir',
        category: 'negative',
        priority: 'high',
        preconditions: 'Kullanici odeme adiminda.',
        steps: [
          'Gecersiz bir kart numarasi gir',
          '"Siparisi Tamamla" butonuna tikla',
        ],
        expectedResult:
          'Odeme reddedilir, "Kart bilgileri gecersiz" mesaji gosterilir ve siparis olusturulmaz.',
      },
    ],
  },
  {
    name: 'Sifre Sifirlama',
    type: ScenarioGroupType.REGRESSION,
    input:
      'Kullanici "Sifremi unuttum" baglantisindan email girer, 15 dakika gecerli sifirlama baglantisi alir ve yeni sifre belirler.',
    scenarios: [
      {
        title: 'Sifirlama baglantisi ile yeni sifre belirleme',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Kayitli bir kullanici email adresi mevcut.',
        steps: [
          '"Sifremi unuttum" baglantisina tikla',
          'Kayitli email adresini gir',
          'Email ile gelen baglantiya tikla',
          'Yeni sifreyi gir ve onayla',
        ],
        expectedResult:
          'Sifre guncellenir ve kullanici yeni sifre ile giris yapabilir.',
      },
      {
        title: 'Suresi gecmis baglanti reddedilir',
        category: 'edge_case',
        priority: 'medium',
        preconditions: '15 dakikadan eski bir sifirlama baglantisi mevcut.',
        steps: ['Suresi gecmis sifirlama baglantisina tikla'],
        expectedResult:
          '"Baglantinin suresi dolmus" mesaji gosterilir ve yeni baglanti istenmesi onerilir.',
      },
    ],
  },
];

const BANKING_GROUPS: SeedGroup[] = [
  {
    name: 'Biyometrik Giris',
    type: ScenarioGroupType.SMOKE,
    input:
      'Kullanici mobil bankacilik uygulamasina yuz tanima veya parmak izi ile giris yapar. Biyometrik dogrulama basarisiz olursa PIN ile giris istenir, 3 hatali PIN denemesinde uygulama gecici olarak kilitlenir.',
    scenarios: [
      {
        title: 'Parmak izi ile hizli giris',
        category: 'happy_path',
        priority: 'critical',
        preconditions:
          'Cihazda parmak izi kayitli ve uygulamada biyometrik giris etkin.',
        steps: [
          'Uygulamayi ac',
          'Parmak izi sensorune dokun',
        ],
        expectedResult:
          'Biyometrik dogrulama basarili olur ve kullanici ana hesap ekranina yonlendirilir.',
      },
      {
        title: 'Biyometrik basarisiz olunca PIN ile giris',
        category: 'edge_case',
        priority: 'high',
        preconditions: 'Biyometrik giris etkin ancak sensor okuma yapamiyor.',
        steps: [
          'Uygulamayi ac',
          'Parmak izi okutmayi 2 kez dene',
          'Acilan ekrana 6 haneli PIN gir',
        ],
        expectedResult:
          'Biyometrik dogrulama atlanarak PIN ekrani gosterilir ve dogru PIN ile giris tamamlanir.',
      },
      {
        title: '3 hatali PIN sonrasi gecici kilit',
        category: 'negative',
        priority: 'high',
        preconditions: 'Kullanici PIN giris ekraninda.',
        steps: ['Hatali PIN ile 3 kez giris dene'],
        expectedResult:
          'Uygulama 5 dakika kilitlenir ve "Cok fazla hatali deneme" mesaji gosterilir.',
      },
    ],
  },
  {
    name: 'Para Transferi',
    type: ScenarioGroupType.E2E,
    input:
      'Kullanici kendi hesabindan baska bir IBAN\'a para transfer eder. Yetersiz bakiyede islem reddedilir, gunluk transfer limiti asilirsa uyari verilir, islem SMS OTP ile onaylanir.',
    scenarios: [
      {
        title: 'Baska IBAN\'a basarili havale',
        category: 'happy_path',
        priority: 'critical',
        preconditions:
          'Kullanici giris yapmis ve gonderen hesapta yeterli bakiye mevcut.',
        steps: [
          'Para transferi ekranini ac',
          'Alici IBAN ve tutari gir',
          'Islemi onayla',
          'SMS ile gelen OTP kodunu gir',
        ],
        expectedResult:
          'Transfer tamamlanir, gonderen bakiyesi guncellenir ve islem dekontu olusturulur.',
      },
      {
        title: 'Yetersiz bakiyede transfer reddedilir',
        category: 'negative',
        priority: 'high',
        preconditions: 'Hesap bakiyesi girilen tutardan az.',
        steps: [
          'Para transferi ekranini ac',
          'Bakiyeden yuksek bir tutar gir',
          'Islemi onayla',
        ],
        expectedResult:
          '"Yetersiz bakiye" mesaji gosterilir ve transfer gerceklesmez.',
      },
      {
        title: 'Gunluk limit asiminda uyari',
        category: 'edge_case',
        priority: 'medium',
        preconditions: 'Gunluk transfer limitine cok yakin toplam islem yapilmis.',
        steps: [
          'Kalan limitten yuksek bir tutar gir',
          'Islemi onayla',
        ],
        expectedResult:
          '"Gunluk transfer limiti asildi" uyarisi gosterilir ve islem tamamlanmaz.',
      },
    ],
  },
  {
    name: 'Fatura Odeme',
    type: ScenarioGroupType.FEATURE,
    input:
      'Kullanici kayitli faturalarini goruntuler ve odeme yapar. Otomatik odeme talimati tanimlayabilir, gecmis odeme yapilan fatura tekrar odenemez.',
    scenarios: [
      {
        title: 'Elektrik faturasi odeme',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Kayitli bir elektrik faturasi ve yeterli bakiye mevcut.',
        steps: [
          'Fatura odeme ekranini ac',
          'Odenmemis elektrik faturasini sec',
          '"Ode" butonuna tikla',
        ],
        expectedResult:
          'Fatura odenir, bakiye guncellenir ve fatura durumu "Odendi" olarak isaretlenir.',
      },
      {
        title: 'Odenmis fatura tekrar odenemez',
        category: 'negative',
        priority: 'medium',
        preconditions: 'Daha once odenmis bir fatura mevcut.',
        steps: [
          'Fatura listesini ac',
          'Durumu "Odendi" olan faturayi sec',
        ],
        expectedResult:
          '"Ode" butonu pasif gorunur ve fatura tekrar odenemez.',
      },
    ],
  },
];

const HOSPITAL_GROUPS: SeedGroup[] = [
  {
    name: 'Hasta Kayit',
    type: ScenarioGroupType.SMOKE,
    input:
      'Yeni hasta TC kimlik numarasi ve iletisim bilgileriyle sisteme kaydedilir. Ayni TC ile ikinci kayit engellenir, gecersiz TC formati reddedilir.',
    scenarios: [
      {
        title: 'Yeni hasta kaydi olusturma',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Resepsiyon kullanicisi sisteme giris yapmis.',
        steps: [
          'Hasta kayit formunu ac',
          'Ad, soyad, TC kimlik ve telefon bilgilerini gir',
          '"Kaydet" butonuna tikla',
        ],
        expectedResult:
          'Hasta kaydi olusturulur ve benzersiz bir hasta protokol numarasi atanir.',
      },
      {
        title: 'Ayni TC ile mukerrer kayit engellenir',
        category: 'negative',
        priority: 'high',
        preconditions: 'Sistemde ayni TC kimlik ile kayitli bir hasta mevcut.',
        steps: [
          'Hasta kayit formunu ac',
          'Var olan bir TC kimlik numarasi gir',
          '"Kaydet" butonuna tikla',
        ],
        expectedResult:
          '"Bu TC kimlik ile kayitli hasta mevcut" mesaji gosterilir ve yeni kayit olusturulmaz.',
      },
    ],
  },
  {
    name: 'Randevu Alma',
    type: ScenarioGroupType.FEATURE,
    input:
      'Hasta poliklinik ve doktor secerek uygun tarih/saatte randevu alir. Dolu saat secilemez, ayni gun ayni bolume ikinci randevu engellenir.',
    scenarios: [
      {
        title: 'Musait saatte randevu olusturma',
        category: 'happy_path',
        priority: 'critical',
        preconditions: 'Secilen doktorun bos randevu saatleri mevcut.',
        steps: [
          'Poliklinik ve doktor sec',
          'Takvimden musait bir saat sec',
          '"Randevu Al" butonuna tikla',
        ],
        expectedResult:
          'Randevu olusturulur, hastaya onay SMS\'i gonderilir ve saat dolu olarak isaretlenir.',
      },
      {
        title: 'Dolu saat secilemez',
        category: 'edge_case',
        priority: 'high',
        preconditions: 'Secilen doktorun bazi saatleri doludur.',
        steps: [
          'Poliklinik ve doktor sec',
          'Takvimde dolu (gri) bir saat secmeyi dene',
        ],
        expectedResult:
          'Dolu saat pasiftir ve secilemez, sadece musait saatler tiklanabilir.',
      },
      {
        title: 'Ayni gun ayni bolume ikinci randevu engellenir',
        category: 'negative',
        priority: 'medium',
        preconditions: 'Hastanin ayni gun ayni poliklinikte randevusu mevcut.',
        steps: [
          'Ayni poliklinikte ayni gune yeni randevu almayi dene',
        ],
        expectedResult:
          '"Bu bolumde ayni gun icin zaten randevunuz var" mesaji gosterilir.',
      },
    ],
  },
  {
    name: 'Randevu Iptali',
    type: ScenarioGroupType.REGRESSION,
    input:
      'Hasta gelecekteki randevusunu iptal eder ve saat tekrar musaite doner. Randevu saatine 1 saatten az kalmissa iptal engellenir.',
    scenarios: [
      {
        title: 'Randevu iptali ile saatin bosaltilmasi',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Hastanin gelecekte 1 saatten uzak bir randevusu mevcut.',
        steps: [
          'Randevularim ekranini ac',
          'Ilgili randevunun "Iptal Et" butonuna tikla',
          'Iptali onayla',
        ],
        expectedResult:
          'Randevu iptal edilir ve ilgili saat tekrar musait hale gelir.',
      },
      {
        title: 'Son 1 saatte iptal engellenir',
        category: 'edge_case',
        priority: 'medium',
        preconditions: 'Randevu saatine 1 saatten az kalmis.',
        steps: [
          'Randevularim ekranini ac',
          'Yaklasan randevuyu iptal etmeyi dene',
        ],
        expectedResult:
          '"Randevu saatine 1 saatten az kaldigi icin iptal edilemez" mesaji gosterilir.',
      },
    ],
  },
];

const FOOD_DELIVERY_GROUPS: SeedGroup[] = [
  {
    name: 'Restoran Arama',
    type: ScenarioGroupType.FEATURE,
    input:
      'Kullanici konumuna gore restoranlari listeler, mutfak turune ve puana gore filtreler. Teslimat alani disindaki restoranlar "kapali" gosterilir.',
    scenarios: [
      {
        title: 'Konuma gore restoran listeleme',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Kullanicinin teslimat adresi tanimli.',
        steps: [
          'Ana sayfayi ac',
          'Teslimat adresini sec',
        ],
        expectedResult:
          'Adrese teslimat yapan acik restoranlar tahmini teslimat suresiyle listelenir.',
      },
      {
        title: 'Mutfak turune gore filtreleme',
        category: 'happy_path',
        priority: 'medium',
        preconditions: 'Restoran listesi goruntuleniyor.',
        steps: [
          '"Filtrele" butonuna tikla',
          '"Pizza" mutfak turunu sec',
          'Filtreyi uygula',
        ],
        expectedResult:
          'Sadece pizza kategorisindeki restoranlar listede gosterilir.',
      },
      {
        title: 'Teslimat alani disi restoran kapali gorunur',
        category: 'edge_case',
        priority: 'medium',
        preconditions: 'Secili adres bazi restoranlarin teslimat alani disinda.',
        steps: [
          'Teslimat alani disindaki bir restorani ac',
        ],
        expectedResult:
          'Restoran "Bu adrese teslimat yapmiyor" olarak gosterilir ve sepete urun eklenemez.',
      },
    ],
  },
  {
    name: 'Siparis Takibi',
    type: ScenarioGroupType.E2E,
    input:
      'Kullanici siparis verir ve durumunu (hazirlaniyor, yolda, teslim edildi) canli takip eder. Iptal yalnizca restoran onaylamadan once yapilabilir.',
    scenarios: [
      {
        title: 'Siparis verme ve canli durum takibi',
        category: 'happy_path',
        priority: 'critical',
        preconditions: 'Sepette urun var ve odeme yontemi tanimli.',
        steps: [
          'Sepeti ac ve "Siparisi Onayla" butonuna tikla',
          'Odemeyi tamamla',
          'Siparis takip ekranini ac',
        ],
        expectedResult:
          'Siparis olusturulur ve durumu "Onaylandi -> Hazirlaniyor -> Yolda" olarak canli guncellenir.',
      },
      {
        title: 'Restoran onayindan once iptal',
        category: 'happy_path',
        priority: 'high',
        preconditions: 'Siparis verilmis ancak restoran henuz onaylamamis.',
        steps: [
          'Siparis takip ekranini ac',
          '"Siparisi Iptal Et" butonuna tikla',
        ],
        expectedResult:
          'Siparis iptal edilir ve odeme tutari kullaniciya iade edilir.',
      },
      {
        title: 'Restoran onayindan sonra iptal engellenir',
        category: 'negative',
        priority: 'medium',
        preconditions: 'Restoran siparisi onaylayip hazirlamaya baslamis.',
        steps: [
          'Siparis takip ekranini ac',
          '"Siparisi Iptal Et" butonuna tikla',
        ],
        expectedResult:
          '"Siparis hazirlandigi icin iptal edilemez" mesaji gosterilir.',
      },
    ],
  },
  {
    name: 'Degerlendirme',
    type: ScenarioGroupType.FEATURE,
    input:
      'Kullanici teslim edilen siparis icin restorana ve kuryeye 1-5 yildiz puan verir. Ayni siparis birden fazla kez degerlendirilemez.',
    scenarios: [
      {
        title: 'Teslim edilen siparise puan verme',
        category: 'happy_path',
        priority: 'medium',
        preconditions: 'Durumu "Teslim edildi" olan bir siparis mevcut.',
        steps: [
          'Gecmis siparislerden ilgili siparisi ac',
          'Restoran ve kuryeye yildiz puani ver',
          '"Gonder" butonuna tikla',
        ],
        expectedResult:
          'Degerlendirme kaydedilir ve restoranin ortalama puani guncellenir.',
      },
      {
        title: 'Ayni siparis tekrar degerlendirilemez',
        category: 'negative',
        priority: 'low',
        preconditions: 'Daha once degerlendirilmis bir siparis mevcut.',
        steps: [
          'Degerlendirilmis siparisi tekrar acmayi dene',
        ],
        expectedResult:
          'Verilen puanlar salt-okunur gosterilir ve tekrar gonderim yapilamaz.',
      },
    ],
  },
];

const PROJECTS: SeedProject[] = [
  {
    name: 'E-Ticaret QA Platformu',
    description:
      'Demo amacli ornek e-ticaret projesi: giris, sepet, odeme ve sifre sifirlama akislari.',
    groups: ECOMMERCE_GROUPS,
  },
  {
    name: 'Mobil Bankacilik Uygulamasi',
    description:
      'Fintech konsepti: biyometrik giris, para transferi ve fatura odeme akislari.',
    groups: BANKING_GROUPS,
  },
  {
    name: 'Hastane Randevu Sistemi',
    description:
      'Saglik konsepti: hasta kayit, poliklinik randevu alma ve randevu iptal akislari.',
    groups: HOSPITAL_GROUPS,
  },
  {
    name: 'Yemek Siparis Platformu',
    description:
      'Teslimat konsepti: restoran arama, canli siparis takibi ve degerlendirme akislari.',
    groups: FOOD_DELIVERY_GROUPS,
  },
];

function buildRawOutput(s: SeedScenario): string {
  return JSON.stringify({
    category: s.category,
    priority: s.priority,
    preconditions: s.preconditions,
    steps: s.steps,
    expectedResult: s.expectedResult,
  });
}

// Projeleri altina ekleyecegimiz gercek kullanici. Bu hesabin DB'de zaten var
// oldugu varsayilir; seed onu OLUSTURMAZ, sadece email ile bulup baglar.
const REAL_USER_EMAIL = 'elif.pazarbasi@id3.com.tr';

const SEED_PROJECT_NAMES = PROJECTS.map((p) => p.name);

interface SeedTotals {
  projects: number;
  groups: number;
  scenarios: number;
}

// Bir kullanicinin altina seed projelerini olusturur. Idempotentlik icin
// yalnizca seed'in kendi isimli projelerini temizler; kullanicinin diger
// (gercek) projelerine dokunmaz.
async function seedForUser(userId: string): Promise<SeedTotals> {
  await prisma.project.deleteMany({
    where: { userId, name: { in: SEED_PROJECT_NAMES } },
  });

  const totals: SeedTotals = { projects: 0, groups: 0, scenarios: 0 };
  for (const p of PROJECTS) {
    const project = await prisma.project.create({
      data: { name: p.name, description: p.description, userId },
    });
    totals.projects++;

    for (const g of p.groups) {
      const group = await prisma.scenarioGroup.create({
        data: { name: g.name, type: g.type, projectId: project.id },
      });
      totals.groups++;

      for (const s of g.scenarios) {
        await prisma.testScenario.create({
          data: {
            title: s.title,
            input: g.input,
            rawOutput: buildRawOutput(s),
            bddOutput: '',
            category: s.category,
            priority: s.priority,
            preconditions: s.preconditions,
            steps: s.steps,
            expectedResult: s.expectedResult,
            sourceType: 'text',
            projectId: project.id,
            groupId: group.id,
          },
        });
        totals.scenarios++;
      }
    }
  }

  return totals;
}

async function main(): Promise<void> {
  const hashed = await bcrypt.hash(DEMO_USER.password, 10);

  // Demo kullanici: yoksa olustur, varsa guncelle.
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: { name: DEMO_USER.name, password: hashed },
    create: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      password: hashed,
    },
  });

  // Gercek kullanici: sadece bul, olusturma.
  const realUser = await prisma.user.findUnique({
    where: { email: REAL_USER_EMAIL },
    select: { id: true, email: true },
  });

  console.log('Seed tamamlandi:');

  const demoTotals = await seedForUser(demoUser.id);
  console.log(
    `  ${DEMO_USER.email} (demo) -> ${demoTotals.projects} proje, ` +
      `${demoTotals.groups} grup, ${demoTotals.scenarios} senaryo`,
  );

  if (realUser) {
    const realTotals = await seedForUser(realUser.id);
    console.log(
      `  ${realUser.email} -> ${realTotals.projects} proje, ` +
        `${realTotals.groups} grup, ${realTotals.scenarios} senaryo`,
    );
  } else {
    console.warn(
      `  UYARI: ${REAL_USER_EMAIL} kullanicisi bulunamadi, atlandi. ` +
        'Once bu email ile kayit olun.',
    );
  }
}

main()
  .catch((e) => {
    console.error('Seed hatasi:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
