// src/app.module.ts
import { Module } from '@nestjs/common';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organizations/organizations.module';
import { UserModule } from './users/users.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { ListsModule } from './lists/lists.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ClickStatsModule } from './click_stats/click_stats.module';
import { EmailModule } from './email/email.module';
import { QueuesModule } from './queues/queues.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SecurityModule } from './security/security.module';
import { TasksModule } from './tasks/task.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config) => {
        const required = [
          'POSTGRES_HOST',
          'POSTGRES_USER',
          'POSTGRES_PASSWORD',
          'POSTGRES_DB',
          'JWT_SECRET',
          'TRACKING_TOKEN_SECRET',
          'REDIS_HOST',
          'SMTP_HOST',
          'SMTP_USER',
          'SMTP_PASS',
          'SMTP_FROM_EMAIL',
          'APP_BASE_URL',
        ];
        for (const key of required) {
          if (!config[key]) {
            throw new Error(
              `Missing required env var: ${key}`,
            );
          }
        }
        return config;
      },
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>(
          'POSTGRES_HOST',
        ),
        port: config.get<number>(
          'POSTGRES_PORT',
          5432,
        ),
        username: config.getOrThrow<string>(
          'POSTGRES_USER',
        ),
        password: config.getOrThrow<string>(
          'POSTGRES_PASSWORD',
        ),
        database: config.getOrThrow<string>(
          'POSTGRES_DB',
        ),
        autoLoadEntities: true,
        synchronize:
          config.get('NODE_ENV') !== 'production',
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        retryAttempts: 5,
        retryDelay: 3000,
        logging:
          config.get('NODE_ENV') !== 'production',
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.getOrThrow('REDIS_HOST'),
          port: config.get<number>(
            'REDIS_PORT',
            6379,
          ),
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) =>
            Math.min(times * 200, 5000),
        },
      }),
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    ScheduleModule.forRoot(),

    AuthModule,
    OrganizationModule,
    UserModule,
    SubscribersModule,
    ListsModule,
    CampaignsModule,
    ClickStatsModule,
    EmailModule,
    QueuesModule,
    RealtimeModule,
    SecurityModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
