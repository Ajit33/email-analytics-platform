// organizations/organizations.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/role.decorator';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(
    private readonly orgService: OrganizationService,
  ) {}

  @Post()
  @Roles('admin')
  async create(
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgService.create(dto);
  }

  @Get('me')
  async getMyOrg(@Req() req: AuthRequest) {
    return this.orgService.findById(
      req.user.orgId,
    );
  }

  @Patch('me')
  @Roles('admin')
  async updateMyOrg(
    @Req() req: AuthRequest,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(
      req.user.orgId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.orgService.remove(id);
  }
}
