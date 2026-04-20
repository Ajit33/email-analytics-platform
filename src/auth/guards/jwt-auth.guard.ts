// auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard(
  'jwt',
) {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<T>(
    err: Error | null,
    user: T,
    info: { name?: string } | undefined,
  ): T {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token has expired',
        );
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(
          'Invalid token',
        );
      }
      throw new UnauthorizedException(
        'Authentication required',
      );
    }
    return user;
  }
}
