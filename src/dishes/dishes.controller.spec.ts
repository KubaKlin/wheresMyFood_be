import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthenticationGuard } from '../authentication/jwt-authentication.guard';
import { createTestApp } from '../test-utils/supertest-app';
import { mockJwtAuthenticationGuard } from '../test-utils/mock-jwt-auth-guard';
import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';

describe('The DishesController', () => {
  let app: INestApplication;

  let createMock: jest.Mock;
  let getAllForRestaurantMock: jest.Mock;
  let getByIdMock: jest.Mock;
  let deleteMock: jest.Mock;
  let updateMock: jest.Mock;

  beforeEach(async () => {
    createMock = jest.fn();
    getAllForRestaurantMock = jest.fn();
    getByIdMock = jest.fn();
    deleteMock = jest.fn();
    updateMock = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [DishesController],
      providers: [
        {
          provide: DishesService,
          useValue: {
            create: createMock,
            getAllForRestaurant: getAllForRestaurantMock,
            getById: getByIdMock,
            delete: deleteMock,
            update: updateMock,
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

  describe('when the POST /dishes endpoint is called', () => {
    describe('and the user is not authenticated', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          controllers: [DishesController],
          providers: [
            {
              provide: DishesService,
              useValue: {
                create: createMock,
                getAllForRestaurant: getAllForRestaurantMock,
                getById: getByIdMock,
                delete: deleteMock,
                update: updateMock,
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
        return request(app.getHttpServer())
          .post('/dishes')
          .send({ name: 'Pizza', price: 3500 })
          .expect(401);
      });
    });

    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/dishes')
          .send({})
          .expect(400);
      });
    });

    describe('and correct data is provided', () => {
      beforeEach(() => {
        createMock.mockResolvedValue({ id: 10, name: 'Pizza', price: 3500 });
      });

      it('should respond with created dish', () => {
        return request(app.getHttpServer())
          .post('/dishes')
          .send({ name: 'Pizza', price: 3500 })
          .expect(201)
          .expect({ id: 10, name: 'Pizza', price: 3500 });
      });
    });
  });

  describe('when the GET /dishes endpoint is called', () => {
    beforeEach(() => {
      getAllForRestaurantMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should return dishes for restaurant', () => {
      return request(app.getHttpServer())
        .get('/dishes')
        .expect(200)
        .expect([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('when the GET /dishes/:id endpoint is called', () => {
    beforeEach(() => {
      getByIdMock.mockResolvedValue({ id: 1, name: 'Pizza', price: 3500 });
    });

    it('should return dish', () => {
      return request(app.getHttpServer())
        .get('/dishes/1')
        .expect(200)
        .expect({ id: 1, name: 'Pizza', price: 3500 });
    });
  });

  describe('when the PATCH /dishes/:id endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/dishes/1')
          .send({ price: -1 })
          .expect(400);
      });
    });

    describe('and correct data is provided', () => {
      beforeEach(() => {
        updateMock.mockResolvedValue({ id: 1, name: 'Pizza', price: 4000 });
      });

      it('should return updated dish', () => {
        return request(app.getHttpServer())
          .patch('/dishes/1')
          .send({ price: 4000 })
          .expect(200)
          .expect({ id: 1, name: 'Pizza', price: 4000 });
      });
    });
  });

  describe('when the DELETE /dishes/:id endpoint is called', () => {
    beforeEach(() => {
      deleteMock.mockResolvedValue({ id: 1 });
    });

    it('should respond with 200', () => {
      return request(app.getHttpServer()).delete('/dishes/1').expect(200);
    });
  });

  describe('when the user is not authenticated', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [DishesController],
        providers: [
          {
            provide: DishesService,
            useValue: {
              create: createMock,
              getAllForRestaurant: getAllForRestaurantMock,
              getById: getByIdMock,
              delete: deleteMock,
              update: updateMock,
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

    it('should respond with 401 for POST /dishes', () => {
      return request(app.getHttpServer())
        .post('/dishes')
        .send({ name: 'Pizza', price: 3500 })
        .expect(401);
    });

    it('should respond with 401 for GET /dishes', () => {
      return request(app.getHttpServer()).get('/dishes').expect(401);
    });

    it('should respond with 401 for GET /dishes/:id', () => {
      return request(app.getHttpServer()).get('/dishes/1').expect(401);
    });

    it('should respond with 401 for PATCH /dishes/:id', () => {
      return request(app.getHttpServer())
        .patch('/dishes/1')
        .send({ price: 4000 })
        .expect(401);
    });

    it('should respond with 401 for DELETE /dishes/:id', () => {
      return request(app.getHttpServer()).delete('/dishes/1').expect(401);
    });
  });
});
