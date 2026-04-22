// click_stats/link.repository.ts
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  QueryFailedError,
} from 'typeorm';
import { Link } from './entities/link.entity';

@Injectable()
export class LinkRepository {
  private readonly logger = new Logger(
    LinkRepository.name,
  );

  constructor(
    @InjectRepository(Link)
    private readonly repo: Repository<Link>,
  ) {}

  // Used by ClickStatsService.getOrCreateLink() — step 1: check if exists
  async findByCampaignAndUrl(
    campaignId: string,
    url: string,
  ): Promise<Link | null> {
    return this.repo.findOne({
      where: { campaignId, url },
    });
  }

  async create(data: {
    campaignId: string;
    url: string;
  }): Promise<Link> {
    try {
      const link = this.repo.create({
        campaignId: data.campaignId,
        url: data.url,
        clickCount: 0,
      });
      return await this.repo.save(link);
    } catch (err) {
      // Race condition — another request inserted the same row between
      // our findByCampaignAndUrl check and this insert
      if (
        err instanceof QueryFailedError &&
        (err as any).code === '23505'
      ) {
        this.logger.warn(
          `Race condition on link insert — campaign: ${data.campaignId}, url: ${data.url}`,
        );
        const fallback = await this.repo.findOne({
          where: {
            campaignId: data.campaignId,
            url: data.url,
          },
        });
        if (fallback) return fallback;
      }
      throw err;
    }
  }

  // Convenience method that combines both steps above — used by CampaignService
  async getOrCreate(
    url: string,
    campaignId: string,
  ): Promise<Link> {
    const existing =
      await this.findByCampaignAndUrl(
        campaignId,
        url,
      );
    if (existing) return existing;
    return this.create({ campaignId, url });
  }

  async incrementClickCount(
    id: string,
  ): Promise<void> {
    await this.repo.increment(
      { id },
      'clickCount',
      1,
    );
  }

  async findById(
    id: string,
  ): Promise<Link | null> {
    return this.repo.findOne({ where: { id } });
  }
}
