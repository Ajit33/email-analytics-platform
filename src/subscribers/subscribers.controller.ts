// subscribers/subscribers.controller.ts
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('subscribers')
export class SubscribersController {
  constructor(
    private readonly subscribersService: SubscribersService,
  ) {}

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateSubscriberDto,
  ) {
    return this.subscribersService.create(
      req.user.orgId,
      dto,
    );
  }

  @Get('stats')
  getStats(@Req() req: AuthRequest) {
    return this.subscribersService.getStats(
      req.user.orgId,
    );
  }

  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query(
      'page',
      new DefaultValuePipe(1),
      ParseIntPipe,
    )
    page: number,
    @Query(
      'limit',
      new DefaultValuePipe(10),
      ParseIntPipe,
    )
    limit: number,
  ) {
    return this.subscribersService.findAll(
      req.user.orgId,
      page,
      limit,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscribersService.findById(
      id,
      req.user.orgId,
    );
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriberDto,
  ) {
    return this.subscribersService.update(
      id,
      req.user.orgId,
      dto,
    );
  }

  @Patch(':id/unsubscribe')
  unsubscribe(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscribersService.unsubscribe(
      id,
      req.user.orgId,
    );
  }

  @Patch(':id/resubscribe')
  resubscribe(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subscribersService.resubscribe(
      id,
      req.user.orgId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.subscribersService.remove(
      id,
      req.user.orgId,
    );
  }
}
