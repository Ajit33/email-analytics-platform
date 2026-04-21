// email/email.controller.ts
import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { EmailService } from './email.service';

class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

@Controller('emails')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
  ) {}

  @Post('send')
  async sendEmail(@Body() body: SendEmailDto) {
    await this.emailService.send({
      to: body.to,
      toName: body.to,
      subject: body.subject,
      html: `<p>${body.text}</p>`,
    });

    return {
      message: `Email sent successfully to ${body.to}`,
    };
  }
}
