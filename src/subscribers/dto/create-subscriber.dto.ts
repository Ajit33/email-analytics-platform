// subscribers/dto/create-subscriber.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSubscriberDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) =>
    value?.toLowerCase().trim(),
  )
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fullName: string;

  @IsUUID()
  @IsNotEmpty()
  listId: string;
}
