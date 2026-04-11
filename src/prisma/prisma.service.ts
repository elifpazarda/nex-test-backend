import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(config: ConfigService) {
    const adapter = new PrismaPg(config.get('DATABASE_URL')!);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
