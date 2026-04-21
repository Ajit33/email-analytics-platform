// lists/lists.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as csv from 'fast-csv';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { List } from './entities/list.entity';
import { ListRepository } from './lists.repository';
import { SubscriberRepository } from '../subscribers/subscriber.repository';

interface CsvImportResult {
  totalCsvRows: number;
  alreadyExisted: number;
  newlyAdded: number;
  skipped: number;
}

@Injectable()
export class ListService {
  constructor(
    private readonly listRepo: ListRepository,
    private readonly subscriberRepo: SubscriberRepository,
  ) {}

  async create(
    orgId: string,
    dto: CreateListDto,
  ): Promise<List> {
    const exists =
      await this.listRepo.findByNameAndOrg(
        dto.name,
        orgId,
      );
    if (exists) {
      throw new BadRequestException(
        'List name already exists in this organization',
      );
    }

    return this.listRepo.create({
      name: dto.name,
      customFields: dto.customFields ?? null,
      organizationId: orgId,
    });
  }

  async findAll(orgId: string): Promise<List[]> {
    return this.listRepo.findAllByOrg(orgId);
  }

  async findById(
    id: string,
    orgId: string,
  ): Promise<List> {
    const list =
      await this.listRepo.findByIdAndOrg(
        id,
        orgId,
      );
    if (!list) {
      throw new NotFoundException(
        'List not found',
      );
    }
    return list;
  }

  async update(
    id: string,
    orgId: string,
    dto: UpdateListDto,
  ): Promise<List> {
    const list = await this.findById(id, orgId);

    if (dto.name && dto.name !== list.name) {
      const conflict =
        await this.listRepo.findByNameAndOrg(
          dto.name,
          orgId,
        );
      if (conflict) {
        throw new BadRequestException(
          'List name already exists in this organization',
        );
      }
      list.name = dto.name;
    }

    if (dto.customFields !== undefined) {
      list.customFields = dto.customFields;
    }

    return this.listRepo.save(list);
  }

  async remove(
    id: string,
    orgId: string,
  ): Promise<void> {
    const list = await this.findById(id, orgId);
    await this.listRepo.remove(list);
  }

  async importCsv(
    listId: string,
    orgId: string,
    filePath: string,
  ): Promise<CsvImportResult> {
    const list =
      await this.listRepo.findByIdAndOrg(
        listId,
        orgId,
      );
    if (!list) {
      throw new NotFoundException(
        'List not found',
      );
    }

    const rows: Array<{
      email: string;
      customFields: Record<string, any>;
    }> = [];
    const seenEmails = new Set<string>();
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(
          csv.parse({
            headers: true,
            maxRows: 50000,
          }),
        )
        .on('error', (err) => {
          this.cleanupFile(filePath);
          reject(
            new BadRequestException(
              `CSV parse error: ${err.message}`,
            ),
          );
        })
        .on('data', (row) => {
          const email = row.email
            ?.trim()
            .toLowerCase();
          if (!email || !emailRegex.test(email))
            return;
          if (seenEmails.has(email)) return;

          seenEmails.add(email);

          const customFields: Record<
            string,
            any
          > = {};
          for (const key of Object.keys(row)) {
            if (key.toLowerCase() !== 'email') {
              const value = row[key]?.trim();
              if (value)
                customFields[key] = value;
            }
          }

          rows.push({ email, customFields });
        })
        .on('end', async () => {
          try {
            const existingEmails =
              await this.subscriberRepo.findExistingEmails(
                orgId,
                Array.from(seenEmails),
              );

            const newSubscribers = rows
              .filter(
                (r) =>
                  !existingEmails.has(r.email),
              )
              .map((r) => ({
                email: r.email,
                fullName: r.email.split('@')[0],
                customFields: r.customFields,
                organizationId: orgId,
                listId: list.id,
              }));

            if (newSubscribers.length > 0) {
              await this.subscriberRepo.bulkSave(
                newSubscribers,
              );
            }

            this.cleanupFile(filePath);

            resolve({
              totalCsvRows: seenEmails.size,
              alreadyExisted: existingEmails.size,
              newlyAdded: newSubscribers.length,
              skipped:
                seenEmails.size -
                newSubscribers.length,
            });
          } catch {
            this.cleanupFile(filePath);
            reject(
              new BadRequestException(
                'Error processing CSV file',
              ),
            );
          }
        });
    });
  }

  async segmentSubscribers(
    listId: string,
    orgId: string,
    filters: Record<string, any>,
  ) {
    const list = await this.findById(
      listId,
      orgId,
    );

    for (const key of Object.keys(filters)) {
      if (!/^[a-zA-Z0-9_]+$/.test(key)) {
        throw new BadRequestException(
          `Invalid filter key: ${key}`,
        );
      }
    }

    const combinedFilters = {
      ...(filters || {}),
      ...(list.customFields || {}),
    };

    const results =
      await this.subscriberRepo.segmentByOrg(
        orgId,
        combinedFilters,
      );

    return {
      total: results.length,
      filters,
      data: results,
    };
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // file cleanup is best-effort
    }
  }
}
