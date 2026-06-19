import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RoundsModule } from './rounds/rounds.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RoundsModule],
})
export class AppModule {}
