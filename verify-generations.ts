import { PrismaClient, GenerationStatus } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  // --- setup ---
  const user = await prisma.user.create({
    data: {
      name: 'Verify User',
      email: `verify-${Date.now()}@example.com`,
      password: 'x',
    },
  });
  const project = await prisma.project.create({
    data: { name: 'Trendyol Checkout', userId: user.id },
  });

  await prisma.generation.createMany({
    data: [
      // today
      {
        title: 'Sepet · Ödeme — Q2 PRD',
        sourceType: 'text',
        scenarioCount: 12,
        savedCount: 10,
        durationMs: 4200,
        status: GenerationStatus.SUCCESS,
        userId: user.id,
        projectId: project.id,
        createdAt: new Date(),
      },
      {
        title: 'Kargo takip regresyon',
        sourceType: 'jira',
        sourceRef: 'KARGO-42',
        scenarioCount: 8,
        savedCount: 8,
        durationMs: 6100,
        status: GenerationStatus.SUCCESS,
        userId: user.id,
        projectId: project.id,
        createdAt: new Date(),
      },
      {
        title: 'Login edge case analizi',
        sourceType: 'text',
        scenarioCount: 0,
        savedCount: 0,
        durationMs: 2800,
        status: GenerationStatus.WARNING,
        userId: user.id,
        projectId: project.id,
        createdAt: new Date(),
      },
      // 3 days ago (this week, not today)
      {
        title: 'Üyelik akışı negatif testler',
        sourceType: 'pdf',
        sourceRef: 'prd.pdf',
        scenarioCount: 10,
        savedCount: 5,
        durationMs: 5500,
        status: GenerationStatus.SUCCESS,
        userId: user.id,
        projectId: project.id,
        createdAt: daysAgo(3),
      },
      // 10 days ago (last week)
      {
        title: 'Eski üretim',
        sourceType: 'excel',
        scenarioCount: 6,
        savedCount: 6,
        durationMs: 3000,
        status: GenerationStatus.SUCCESS,
        userId: user.id,
        projectId: project.id,
        createdAt: daysAgo(10),
      },
    ],
  });

  // --- exercise the list query (search + filter, insensitive contains) ---
  const listWhere = {
    userId: user.id,
    sourceType: 'text',
  };
  const textRuns = await prisma.generation.findMany({
    where: listWhere,
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log('TEXT runs:', textRuns.map((r) => r.title));

  const searchRuns = await prisma.generation.findMany({
    where: {
      userId: user.id,
      OR: [
        { title: { contains: 'kargo', mode: 'insensitive' } },
        { sourceRef: { contains: 'kargo', mode: 'insensitive' } },
        { project: { name: { contains: 'kargo', mode: 'insensitive' } } },
      ],
    },
  });
  console.log('SEARCH "kargo" ->', searchRuns.map((r) => r.title));

  // --- replicate stats logic ---
  const now = Date.now();
  const runs = await prisma.generation.findMany({
    where: { userId: user.id, createdAt: { gte: daysAgo(14) } },
    select: {
      scenarioCount: true,
      savedCount: true,
      durationMs: true,
      status: true,
      createdAt: true,
    },
  });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now - 7 * 864e5);

  const thisWeek = runs.filter((r) => r.createdAt >= weekAgo);
  const today = runs.filter((r) => r.createdAt >= startOfToday);
  const sum = (a: typeof runs, f: (r: (typeof runs)[0]) => number): number =>
    a.reduce((s, r) => s + f(r), 0);

  const weekly = sum(thisWeek, (r) => r.scenarioCount);
  const approvalSaved = sum(thisWeek, (r) =>
    Math.min(r.savedCount, r.scenarioCount),
  );
  const successful = thisWeek.filter(
    (r) => r.status === GenerationStatus.SUCCESS,
  ).length;

  console.log('STATS:', {
    weeklyScenarioCount: weekly, // expect 12+8+0+10 = 30
    approvalRate: Math.round((approvalSaved / weekly) * 100), // (10+8+0+5)/30 = 23/30 = 77
    todayRunCount: today.length, // 3
    todayScenarioCount: sum(today, (r) => r.scenarioCount), // 20
    todayAvgSec:
      Math.round((sum(today, (r) => r.durationMs) / today.length / 1000) * 10) /
      10, // (4200+6100+2800)/3/1000 = 4.37 -> 4.4
    successRate: Math.round((successful / thisWeek.length) * 100), // 3/4 = 75
  });

  // --- cleanup ---
  await prisma.user.delete({ where: { id: user.id } });
  console.log('cleanup OK');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
