// click-stats/click-stats.controller.ts
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  Throttle,
  ThrottlerGuard,
} from '@nestjs/throttler';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClickStatsService } from './click_stats.service';

const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

@Controller('click-stats')
export class ClickStatsController {
  private readonly logger = new Logger(
    ClickStatsController.name,
  );

  constructor(
    private readonly clickStatsService: ClickStatsService,
  ) {}

  @Get('t/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: 30, ttl: 60000 },
  })
  async trackClick(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let redirectUrl = 'https://example.com';

    try {
      const payload =
        this.clickStatsService.validateClickToken(
          token,
        );
      redirectUrl = payload.url ?? redirectUrl;

      this.clickStatsService
        .pushClickToQueue(
          payload,
          this.extractIp(req),
          this.extractUserAgent(req),
        )
        .catch((err) =>
          this.logger.error(
            `Click queue failed: ${err.message}`,
            err.stack,
          ),
        );
    } catch (err) {
      this.logger.warn(
        `Invalid click token — ip: ${this.extractIp(req)}`,
      );
    }

    res.redirect(302, redirectUrl);
  }

  @Get('o/:token')
  @UseGuards(ThrottlerGuard)
  @Throttle({
    default: { limit: 120, ttl: 60000 },
  })
  async trackOpen(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const payload =
        this.clickStatsService.validateOpenToken(
          token,
        );

      this.clickStatsService
        .pushOpenToQueue(
          payload,
          this.extractIp(req),
          this.extractUserAgent(req),
        )
        .catch((err) =>
          this.logger.error(
            `Open queue failed: ${err.message}`,
            err.stack,
          ),
        );
    } catch (err) {
      this.logger.warn(
        `Invalid open token — ip: ${this.extractIp(req)}`,
      );
    }

    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control':
        'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    res.end(TRACKING_PIXEL);
  }

  @Get('campaign/:campaignId')
  @UseGuards(JwtAuthGuard)
  getCampaignStats(
    @Req() req: AuthRequest,
    @Param('campaignId', ParseUUIDPipe)
    campaignId: string,
  ) {
    return this.clickStatsService.getCampaignStats(
      campaignId,
      req.user.orgId,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getEvents(@Req() req: AuthRequest) {
    return this.clickStatsService.getEventsByOrg(
      req.user.orgId,
    );
  }

  private extractIp(req: Request): string {
    const forwarded =
      req.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded)
      ? forwarded[0]
      : (forwarded?.split(',')[0] ??
        req.socket.remoteAddress ??
        '0.0.0.0');
    return raw.replace(/^::ffff:/, '').trim();
  }

  private extractUserAgent(req: Request): string {
    return (
      req.headers['user-agent'] ?? 'unknown'
    ).substring(0, 512);
  }
}
