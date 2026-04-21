// subscribers/subscribers.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import {
  SubscriberRepository,
  SubscriberStats,
} from './subscriber.repository';
import {
  Subscriber,
  SubscriberStatus,
} from './entities/subscriber.entity';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class SubscribersService {
  constructor(
    private readonly subscriberRepo: SubscriberRepository,
  ) {}

  async create(
    orgId: string,
    dto: CreateSubscriberDto,
  ): Promise<Subscriber> {
    const existing =
      await this.subscriberRepo.findByEmailAndList(
        dto.email,
        orgId,
        dto.listId,
      );

    if (existing) {
      throw new ConflictException(
        `Subscriber "${dto.email}" already exists in this list`,
      );
    }

    return this.subscriberRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      organizationId: orgId,
      listId: dto.listId,
    });
  }

  async findAll(
    orgId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Subscriber>> {
    const skip = (page - 1) * limit;
    const { data, total } =
      await this.subscriberRepo.findByOrganization(
        orgId,
        skip,
        limit,
      );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<Subscriber> {
    const subscriber =
      await this.subscriberRepo.findById(
        id,
        orgId,
      );
    if (!subscriber) {
      throw new NotFoundException(
        'Subscriber not found',
      );
    }
    return subscriber;
  }

  async getStats(
    orgId: string,
  ): Promise<SubscriberStats> {
    return this.subscriberRepo.countByOrganization(
      orgId,
    );
  }

  async update(
    id: string,
    orgId: string,
    dto: UpdateSubscriberDto,
  ): Promise<Subscriber> {
    const subscriber = await this.findById(
      id,
      orgId,
    );

    if (
      dto.email &&
      dto.email !== subscriber.email
    ) {
      const conflict =
        await this.subscriberRepo.findByEmailAndList(
          dto.email,
          orgId,
          subscriber.listId,
        );
      if (conflict) {
        throw new ConflictException(
          `Email "${dto.email}" already exists in this list`,
        );
      }
    }

    if (dto.email !== undefined)
      subscriber.email = dto.email;
    if (dto.fullName !== undefined)
      subscriber.fullName = dto.fullName;
    if (dto.status !== undefined)
      subscriber.status = dto.status;

    return this.subscriberRepo.save(subscriber);
  }

  async unsubscribe(
    id: string,
    orgId: string,
  ): Promise<Subscriber> {
    const subscriber = await this.findById(
      id,
      orgId,
    );
    if (
      subscriber.status ===
      SubscriberStatus.UNSUBSCRIBED
    ) {
      return subscriber;
    }
    subscriber.status =
      SubscriberStatus.UNSUBSCRIBED;
    return this.subscriberRepo.save(subscriber);
  }

  async resubscribe(
    id: string,
    orgId: string,
  ): Promise<Subscriber> {
    const subscriber = await this.findById(
      id,
      orgId,
    );
    if (
      subscriber.status ===
      SubscriberStatus.ACTIVE
    ) {
      return subscriber;
    }
    subscriber.status = SubscriberStatus.ACTIVE;
    return this.subscriberRepo.save(subscriber);
  }

  async remove(
    id: string,
    orgId: string,
  ): Promise<void> {
    const subscriber = await this.findById(
      id,
      orgId,
    );
    await this.subscriberRepo.remove(subscriber);
  }

  async findActiveByList(
    listId: string,
    orgId: string,
  ): Promise<Subscriber[]> {
    return this.subscriberRepo.findActiveByList(
      listId,
      orgId,
    );
  }
}
