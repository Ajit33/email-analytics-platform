// lists/dto/create-list.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateListDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
