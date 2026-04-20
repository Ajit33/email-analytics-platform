// users/user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(
    email: string,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect(
        'user.organization',
        'organization',
      )
      .where('user.email = :email', { email })
      .getOne();
  }

  async findById(
    id: string,
  ): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { id },
    });
    return count > 0;
  }

  async findByIdWithPassword(
    id: string,
  ): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect(
        'user.organization',
        'organization',
      )
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(
    data: Partial<User>,
  ): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async remove(user: User): Promise<void> {
    await this.repo.remove(user);
  }
  async findByRole(
    role: UserRole,
  ): Promise<User | null> {
    return this.repo.findOne({ where: { role } });
  }
}
