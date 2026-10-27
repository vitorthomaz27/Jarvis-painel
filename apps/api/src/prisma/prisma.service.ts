import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from './client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
