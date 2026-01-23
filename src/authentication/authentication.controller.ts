import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import express from 'express';
import { AuthenticationService } from './authentication.service';
import { LogInDto } from './dto/log-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { JwtAuthenticationGuard } from './jwt-authentication.guard';
import type { RequestWithUser } from './request-with-user';
import { UserSignUpDto } from './dto/user-sign-up.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('sign-up')
  async signUp(@Body() signUpData: SignUpDto) {
    return this.authenticationService.signUp(signUpData);
  }

  @Post('user-sign-up')
  async signUpUser(@Body() signUpData: UserSignUpDto) {
    return this.authenticationService.signUpUser(signUpData);
  }

  @HttpCode(200)
  @Post('log-in')
  async logIn(
    @Body() logInData: LogInDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const user =
      await this.authenticationService.getAuthenticatedUser(logInData);
    const cookie = this.authenticationService.getCookieWithJwtToken(user.id);
    response.setHeader('Set-Cookie', cookie);

    return user;
  }

  @HttpCode(200)
  @Post('user-log-in')
  async logInUser(
    @Body() logInData: LogInDto,
    @Res({ passthrough: true }) response: express.Response,
  ) {
    const user =
      await this.authenticationService.getAuthenticatedRestaurantUser(
        logInData,
      );
    const cookie = this.authenticationService.getCookieWithJwtToken(
      user.id,
      'user',
    );
    response.setHeader('Set-Cookie', cookie);

    return user;
  }

  @HttpCode(200)
  @Post('log-out')
  async logOut(@Res({ passthrough: true }) response: express.Response) {
    const cookie = this.authenticationService.getCookieForLogOut();
    response.setHeader('Set-Cookie', cookie);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  authenticate(@Req() request: RequestWithUser) {
    return request.user;
  }
}
