// campaigns/dto/send-campaign.dto.ts
import {
  IsOptional,
  IsObject,
} from 'class-validator';

export class SendCampaignDto {
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}
