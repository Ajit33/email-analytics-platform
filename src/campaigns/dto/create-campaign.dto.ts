// campaigns/dto/create-campaign.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsUrl,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCampaignDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  subject: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsUUID()
  listId: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  targetUrl?: string;

  @IsOptional()
  @IsBoolean()
  clickTrackingDisabled?: boolean;

  @IsOptional()
  @IsBoolean()
  openTrackingDisabled?: boolean;
}
