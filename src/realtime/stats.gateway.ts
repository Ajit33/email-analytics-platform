// realtime/stats.gateway.ts
import {
  OnGatewayConnection,
  OnGatewayInit,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/stats',
  cors: { origin: true, credentials: true },
})
export class StatsGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(
    StatsGateway.name,
  );
  private readonly connectionCounts = new Map<
    string,
    number
  >();
  private readonly maxConnectionsPerOrg: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.maxConnectionsPerOrg =
      this.config.get<number>(
        'WS_MAX_CONNECTIONS_PER_ORG',
        100,
      );
  }

  afterInit() {
    this.logger.log(
      'Stats WebSocket gateway initialized',
    );
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(
        token,
        {
          secret:
            this.config.getOrThrow<string>(
              'JWT_SECRET',
            ),
        },
      );

      const orgId = payload.orgId;
      if (!orgId) {
        this.logger.warn(
          `WS connection rejected: no orgId in token`,
        );
        client.disconnect(true);
        return;
      }

      const currentCount =
        this.connectionCounts.get(orgId) ?? 0;
      if (
        currentCount >= this.maxConnectionsPerOrg
      ) {
        this.logger.warn(
          `WS connection rejected: org ${orgId} at max connections`,
        );
        client.disconnect(true);
        return;
      }

      this.connectionCounts.set(
        orgId,
        currentCount + 1,
      );
      client.data.orgId = orgId;
      client.data.userId = payload.sub;

      await client.join(`tenant:${orgId}`);

      this.logger.log(
        `WS connected: user ${payload.sub}, org ${orgId}`,
      );
    } catch (err) {
      this.logger.warn(
        `WS auth failed: ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const orgId = client.data?.orgId as
      | string
      | undefined;
    if (!orgId) return;

    const count =
      this.connectionCounts.get(orgId) ?? 1;
    const newCount = Math.max(count - 1, 0);

    if (newCount === 0) {
      this.connectionCounts.delete(orgId);
    } else {
      this.connectionCounts.set(orgId, newCount);
    }

    this.logger.log(
      `WS disconnected: ${client.id}, org ${orgId}`,
    );
  }

  async emitClickUpdate(
    orgId: string,
    campaignId: string,
  ): Promise<void> {
    this.emitTenantEvent(
      orgId,
      'click.processed',
      { campaignId },
    );
  }

  emitTenantEvent(
    orgId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    if (!orgId) return;

    this.server
      .to(`tenant:${orgId}`)
      .emit(event, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
  }

  private extractToken(
    client: Socket,
  ): string | null {
    const authToken = client.handshake.auth
      ?.token as string | undefined;
    if (authToken) return authToken;

    const header =
      client.handshake.headers.authorization;
    if (header?.startsWith('Bearer '))
      return header.slice(7);
    const queryToken = client.handshake.query
      ?.token as string | undefined;
    if (queryToken) return queryToken;
    return null;
  }
}
