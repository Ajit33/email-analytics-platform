// realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { StatsGateway } from './stats.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [StatsGateway],
  exports: [StatsGateway],
})
export class RealtimeModule {}
