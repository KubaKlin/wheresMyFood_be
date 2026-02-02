import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { JwtAuthenticationGuard } from './jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { UserType } from './user-type.enum';

describe('The AuthenticationController', () => {
  let app: INestApplication;

  let signUpMock: jest.Mock;
  let getAuthenticatedUserMock: jest.Mock;
  let getCookieWithJwtTokenMock: jest.Mock;
  let getCookieForLogOutMock: jest.Mock;

  beforeEach(async () => {
    signUpMock = jest.fn();
    getAuthenticatedUserMock = jest.fn();
    getCookieWithJwtTokenMock = jest.fn();
    getCookieForLogOutMock = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            signUp: signUpMock,
            getAuthenticatedUser: getAuthenticatedUserMock,
            getCookieWithJwtToken: getCookieWithJwtTokenMock,
            getCookieForLogOut: getCookieForLogOutMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthenticationGuard)
      .useValue({
        ...mockJwtAuthenticationGuard,
        canActivate: (context: ExecutionContext) =>
          mockJwtAuthenticationGuard.canActivate(context),
      })
      .compile();

    app = await createTestApp(module);
  });

  describe('when the POST /authentication/sign-up endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send({ email: 'not-an-email', name: '', password: '123' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        signUpMock.mockResolvedValue({
          id: 1,
          email: 'test@restaurant.com',
          name: 'Test Restaurant',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          inviteCode: 'invite-code',
        });
      });

      it('should respond with the created restaurant account', async () => {
        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send({
            email: 'test@restaurant.com',
            name: 'Test Restaurant',
            password: 'password123',
          })
          .expect(201);

        expect(response.body).toEqual({
          id: 1,
          email: 'test@restaurant.com',
          name: 'Test Restaurant',
          createdAt: '2026-01-01T00:00:00.000Z',
          inviteCode: 'invite-code',
        });
      });
    });
  });

  describe('when the POST /authentication/log-in endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/authentication/log-in')
          .send({ email: 'not-an-email', password: '' })
          .expect(400);
      });
    });

    describe('and the correct data is provided', () => {
      beforeEach(() => {
        getAuthenticatedUserMock.mockResolvedValue({
          id: 1,
          email: 'test@restaurant.com',
          name: 'Test Restaurant',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        });
        getCookieWithJwtTokenMock.mockReturnValue(
          'Authentication=token; HttpOnly; Path=/; Max-Age=3600',
        );
      });

      it('should set authentication cookie', async () => {
        const response = await request(app.getHttpServer())
          .post('/authentication/log-in')
          .send({ email: 'test@restaurant.com', password: 'password123' })
          .expect(200);

        const cookies = response.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const cookieHeader = Array.isArray(cookies)
          ? cookies.join(';')
          : cookies;
        expect(cookieHeader).toContain('Authentication=token');
      });
    });
  });

  describe('when the POST /authentication/log-out endpoint is called', () => {
    beforeEach(() => {
      getCookieForLogOutMock.mockReturnValue(
        'Authentication=; HttpOnly; Path=/; Max-Age=0',
      );
    });

    it('should set log-out cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/authentication/log-out')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieHeader = Array.isArray(cookies) ? cookies.join(';') : cookies;
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });

  describe('when the GET /authentication endpoint is called', () => {
    it('should respond with the authenticated restaurant', () => {
      return request(app.getHttpServer())
        .get('/authentication')
        .expect(200)
        .expect({
          id: 1,
          name: 'Test Restaurant',
          email: 'test@restaurant.com',
          createdAt: '2026-01-01T00:00:00.000Z',
          restaurantId: 1,
          type: UserType.Restaurant,
        });
    });

    describe('and the restaurant is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          controllers: [AuthenticationController],
          providers: [
            {
              provide: AuthenticationService,
              useValue: {
                signUp: signUpMock,
                getAuthenticatedUser: getAuthenticatedUserMock,
                getCookieWithJwtToken: getCookieWithJwtTokenMock,
                getCookieForLogOut: getCookieForLogOutMock,
              },
            },
          ],
        })
          .overrideGuard(JwtAuthenticationGuard)
          .useValue({
            canActivate: () => {
              throw new UnauthorizedException();
            },
          })
          .compile();

        app = await createTestApp(module);
      });

      it('should respond with 401', () => {
        return request(app.getHttpServer()).get('/authentication').expect(401);
      });
    });
  });
});
