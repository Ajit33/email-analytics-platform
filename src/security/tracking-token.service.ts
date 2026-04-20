// security/tracking-token.service.ts
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface TrackingPayload {
  cid: string; // campaignId
  sid: string; // subscriberId
  lid: string; // linkId
  evt: 'click' | 'open';
  url?: string; // original URL — only for click events
  exp: number; // expiration timestamp (seconds)
}

@Injectable()
export class TrackingTokenService {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly config: ConfigService,
  ) {
    this.secret = this.config.getOrThrow<string>(
      'TRACKING_TOKEN_SECRET',
    );
    this.ttlSeconds = this.config.get<number>(
      'TRACKING_TOKEN_TTL',
      30 * 24 * 3600,
    ); // 30 days default
  }

  generate(params: {
    campaignId: string;
    subscriberId: string;
    linkId: string;
    eventType: 'click' | 'open';
    url?: string;
  }): string {
    const payload: TrackingPayload = {
      cid: params.campaignId,
      sid: params.subscriberId,
      lid: params.linkId,
      evt: params.eventType,
      exp:
        Math.floor(Date.now() / 1000) +
        this.ttlSeconds,
    };

    if (
      params.eventType === 'click' &&
      params.url
    ) {
      payload.url = params.url;
    }

    const data = Buffer.from(
      JSON.stringify(payload),
    ).toString('base64url');
    const sig = this.sign(data);

    return `${data}.${sig}`;
  }

  verify(token: string): TrackingPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException(
        'Missing token',
      );
    }

    const dotIndex = token.indexOf('.');
    if (dotIndex === -1) {
      throw new UnauthorizedException(
        'Malformed token',
      );
    }

    const data = token.substring(0, dotIndex);
    const sig = token.substring(dotIndex + 1);

    if (!data || !sig) {
      throw new UnauthorizedException(
        'Malformed token',
      );
    }

    const expected = this.sign(data);

    if (!this.safeCompare(sig, expected)) {
      throw new UnauthorizedException(
        'Invalid token signature',
      );
    }

    let payload: TrackingPayload;
    try {
      payload = JSON.parse(
        Buffer.from(data, 'base64url').toString(
          'utf8',
        ),
      );
    } catch {
      throw new UnauthorizedException(
        'Corrupted token payload',
      );
    }

    if (
      !payload.cid ||
      !payload.sid ||
      !payload.evt
    ) {
      throw new UnauthorizedException(
        'Incomplete token payload',
      );
    }

    if (
      payload.exp &&
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException(
        'Token has expired',
      );
    }

    return payload;
  }

  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }

  private safeCompare(
    a: string,
    b: string,
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(a),
      Buffer.from(b),
    );
  }
}
