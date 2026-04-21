// subscribers/dto/update-subscriber.dto.ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscriberStatus } from '../entities/subscriber.entity';

export class UpdateSubscriberDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) =>
    value?.toLowerCase().trim(),
  )
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fullName?: string;

  @IsOptional()
  @IsEnum(SubscriberStatus)
  status?: SubscriberStatus;
}
