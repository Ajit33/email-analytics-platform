// auth/auth.service.ts
// ─────────────────────────────────────────────────────────────────
// Business logic only — bcrypt, JWT, and response shaping.
// Zero direct DB access. All persistence goes through AuthRepository.
// ─────────────────────────────────────────────────────────────────
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../users/users.service';
import { AuthRepository } from './auth.repository';
import { BootstrapDto } from './dto/bootstrap.dto';

// ── Shared types ──────────────────────────────────────────────────

type JwtUser = {
  id: string;
  email: string;
  role: string;
  orgId: string;
};

interface AuthenticatedUser extends JwtUser {
  fullName: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string;
}

export interface TokenResponse {
  accessToken: string;
}

export interface LoginResponse
  extends TokenResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    orgId: string;
  };
}

// ── Service ───────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    // Removed: DataSource — no direct DB access in service
    // Removed: UserRepository — replaced by AuthRepository
    private readonly authRepo: AuthRepository,
  ) {}

  // Validate email + password — bcrypt is business logic, not DB concern
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const user =
      await this.userService.findByEmailForAuth(
        email,
      );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    if (!user.organization?.id) {
      throw new UnauthorizedException(
        'User has no organization',
      );
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: user.password,
      orgId: user.organization.id,
    };
  }

  async login(
    user: AuthenticatedUser,
  ): Promise<LoginResponse> {
    const payload = this.buildPayload(user);
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  async getProfile(userId: string) {
    return this.userService.findById(userId);
  }

  async refreshToken(
    user: JwtUser,
  ): Promise<TokenResponse> {
    return {
      accessToken: this.jwtService.sign(
        this.buildPayload(user),
      ),
    };
  }

  // Bootstrap creates the first org + admin user atomically.
  // The service only handles: duplicate check, bcrypt hash, JWT sign.
  // The actual DB writes are in AuthRepository.bootstrapTransaction().
  async bootstrap(dto: BootstrapDto) {
    // Duplicate check — DB read delegated to repo
    const existing =
      await this.authRepo.findExistingAdmin();
    if (existing) {
      throw new ConflictException(
        'Superadmin already exists. This route is disabled.',
      );
    }

    // Hash password before passing to repo — crypto is service concern
    const hashedPassword = await bcrypt.hash(
      dto.password,
      12,
    );

    // All DB writes in one transaction inside the repo
    const { user, org } =
      await this.authRepo.bootstrapTransaction({
        organizationName: dto.organizationName,
        email: dto.email.trim().toLowerCase(),
        hashedPassword,
        fullName: dto.fullName.trim(),
      });

    // JWT signing back in the service where it belongs
    const token = this.jwtService.sign(
      this.buildPayload({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: org.id,
      }),
    );

    return {
      message: 'Superadmin created successfully',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      organization: {
        id: org.id,
        name: org.name,
      },
    };
  }

  // Pure function — no side effects
  private buildPayload(
    user: JwtUser,
  ): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };
  }
}
