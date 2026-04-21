// lists/lists.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListService } from './lists.service';

interface AuthRequest {
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string;
  };
}

const CSV_UPLOAD_CONFIG = {
  storage: diskStorage({
    destination: './uploads/csv',
    filename: (_req, file, cb) => {
      cb(
        null,
        `${Date.now()}${extname(file.originalname)}`,
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype !== 'text/csv' &&
      !file.originalname.endsWith('.csv')
    ) {
      cb(
        new BadRequestException(
          'Only CSV files are allowed',
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

@Controller('lists')
@UseGuards(JwtAuthGuard)
export class ListController {
  constructor(
    private readonly listService: ListService,
  ) {}

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateListDto,
  ) {
    return this.listService.create(
      req.user.orgId,
      dto,
    );
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.listService.findAll(
      req.user.orgId,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.listService.findById(
      id,
      req.user.orgId,
    );
  }

  @Patch(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listService.update(
      id,
      req.user.orgId,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listService.remove(
      id,
      req.user.orgId,
    );
  }

  @Post(':listId/import-csv')
  @UseInterceptors(
    FileInterceptor('file', CSV_UPLOAD_CONFIG),
  )
  async importCsv(
    @Req() req: AuthRequest,
    @Param('listId', ParseUUIDPipe)
    listId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded',
      );
    }
    return this.listService.importCsv(
      listId,
      req.user.orgId,
      file.path,
    );
  }

  @Post(':listId/segment')
  segmentSubscribers(
    @Req() req: AuthRequest,
    @Param('listId', ParseUUIDPipe)
    listId: string,
    @Body() filters: Record<string, any>,
  ) {
    return this.listService.segmentSubscribers(
      listId,
      req.user.orgId,
      filters,
    );
  }
}
