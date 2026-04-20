// security/security.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrackingTokenService } from './tracking-token.service';

@Module({
  imports: [ConfigModule],
  providers: [TrackingTokenService],
  exports: [TrackingTokenService],
})
export class SecurityModule {}
