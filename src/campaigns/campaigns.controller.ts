// campaigns/campaigns.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/role.decorator';
import { CampaignService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
  ) {}

  @Post()
  @Roles('admin')
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignService.create(
      req.user.orgId,
      dto,
    );
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.campaignService.findAll(
      req.user.orgId,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.findById(
      id,
      req.user.orgId,
    );
  }

  @Post(':id/send')
  @Roles('admin')
  send(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendCampaignDto,
  ) {
    void dto;
    return this.campaignService.send(
      id,
      req.user.orgId,
    );
  }
}
