// users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserRole } from './entities/user.entity';
import { UserRepository } from './user.repository';
import { OrganizationRepository } from '../organizations/organization.repository';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<{
    id: string;
    email: string;
    fullName: string;
  }> {
    const existing =
      await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        'Email already registered',
      );
    }

    const org = await this.orgRepo.findById(
      dto.organizationId,
    );
    if (!org) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      SALT_ROUNDS,
    );

    const user = await this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: dto.role || UserRole.USER,
      organizationId: dto.organizationId,
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  }

  async findByEmailForAuth(
    email: string,
  ): Promise<User | null> {
    return this.userRepo.findByEmailWithPassword(
      email,
    );
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }
    return user;
  }

  async existsById(id: string): Promise<boolean> {
    return this.userRepo.existsById(id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'No update data provided',
      );
    }

    const user =
      await this.userRepo.findByIdWithPassword(
        id,
      );
    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (dto.email && dto.email !== user.email) {
      const conflict =
        await this.userRepo.findByEmail(
          dto.email,
        );
      if (conflict) {
        throw new ConflictException(
          'Email already in use',
        );
      }
      user.email = dto.email;
    }

    if (dto.fullName) {
      user.fullName = dto.fullName;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(
        dto.password,
        SALT_ROUNDS,
      );
    }

    if (dto.role) {
      user.role = dto.role;
    }

    return this.userRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepo.remove(user);
  }
}
