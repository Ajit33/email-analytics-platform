import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  User,
  UserRole,
} from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

export interface BootstrapResult {
  user: User;
  org: Organization;
}

@Injectable()
export class AuthRepository {
  constructor(
    // DataSource is used only for the atomic bootstrap transaction.
    // All other queries go through their own entity repositories.
    private readonly dataSource: DataSource,
  ) {}

  // Check if any admin user already exists.
  // Used by bootstrap to prevent creating a second superadmin.
  async findExistingAdmin(): Promise<User | null> {
    return this.dataSource
      .getRepository(User)
      .findOne({
        where: { role: UserRole.ADMIN },
      });
  }

  // Creates an organization and an admin user in a single atomic transaction.
  // If either insert fails, both are rolled back — no orphaned org or user.
  // Returns the created entities so the service can build the JWT without
  // needing another DB round-trip.
  async bootstrapTransaction(data: {
    organizationName: string;
    email: string;
    hashedPassword: string;
    fullName: string;
  }): Promise<BootstrapResult> {
    return this.dataSource.transaction(
      async (manager) => {
        // Step 1: create organization
        const org = manager.create(Organization, {
          name: data.organizationName,
        });
        await manager.save(org);

        // Step 2: create admin user linked to that org
        const user = manager.create(User, {
          email: data.email,
          password: data.hashedPassword,
          fullName: data.fullName,
          role: UserRole.ADMIN,
          organizationId: org.id,
        });
        await manager.save(user);

        return { user, org };
      },
    );
  }
}
