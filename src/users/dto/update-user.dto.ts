// users/dto/update-user.dto.ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) =>
    value?.trim().toLowerCase(),
  )
  email?: string;

  @IsOptional()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
