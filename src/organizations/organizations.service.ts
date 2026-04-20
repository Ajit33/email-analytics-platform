// organizations/organizations.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';
import { OrganizationRepository } from './organization.repository';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly orgRepo: OrganizationRepository,
  ) {}

  async create(
    dto: CreateOrganizationDto,
  ): Promise<Organization> {
    const existing =
      await this.orgRepo.findByName(dto.name);
    if (existing) {
      throw new ConflictException(
        'Organization name already exists',
      );
    }

    return this.orgRepo.create({
      name: dto.name,
    });
  }

  async findById(
    id: string,
  ): Promise<Organization> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new NotFoundException(
        'Organization not found',
      );
    }
    return org;
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'No update data provided',
      );
    }

    const org = await this.findById(id);

    if (dto.name && dto.name !== org.name) {
      const conflict =
        await this.orgRepo.findByName(dto.name);
      if (conflict) {
        throw new ConflictException(
          'Organization name already exists',
        );
      }
      org.name = dto.name;
    }

    return this.orgRepo.save(org);
  }

  async remove(id: string): Promise<void> {
    const org = await this.findById(id);
    await this.orgRepo.remove(org);
  }
}
