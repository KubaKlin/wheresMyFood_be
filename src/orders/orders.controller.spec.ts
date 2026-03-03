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
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('The OrdersController', () => {
  let app: INestApplication;

  let createMock: jest.Mock;
  let getCurrentMock: jest.Mock;
  let getCompletedMock: jest.Mock;
  let getClientStatusMock: jest.Mock;
  let getQrPayloadMock: jest.Mock;
  let addDishToOrderMock: jest.Mock;
  let getItemsMock: jest.Mock;
  let updateStatusMock: jest.Mock;

  beforeEach(async () => {
    createMock = jest.fn();
    getCurrentMock = jest.fn();
    getCompletedMock = jest.fn();
    getClientStatusMock = jest.fn();
    getQrPayloadMock = jest.fn();
    addDishToOrderMock = jest.fn();
    getItemsMock = jest.fn();
    updateStatusMock = jest.fn();

    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: createMock,
            getCurrentForRestaurant: getCurrentMock,
            getCompletedForRestaurant: getCompletedMock,
            getClientStatus: getClientStatusMock,
            getQrPayloadForOrder: getQrPayloadMock,
            addDishToOrder: addDishToOrderMock,
            getOrderItemsForRestaurant: getItemsMock,
            updateStatus: updateStatusMock,
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

  describe('when the POST /orders endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({})
          .expect(400);
      });
    });

    describe('and correct data is provided', () => {
      beforeEach(() => {
        createMock.mockResolvedValue({ id: 1, name: 'Table 5' });
      });

      it('should respond with created order', () => {
        return request(app.getHttpServer())
          .post('/orders')
          .send({ name: 'Table 5', additionalInfo: 'No onions' })
          .expect(201)
          .expect({ id: 1, name: 'Table 5' });
      });
    });
  });

  describe('when the GET /orders/current endpoint is called', () => {
    beforeEach(() => {
      getCurrentMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should respond with orders', () => {
      return request(app.getHttpServer())
        .get('/orders/current')
        .expect(200)
        .expect([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('when the GET /orders/completed endpoint is called', () => {
    beforeEach(() => {
      getCompletedMock.mockResolvedValue([{ id: 3 }]);
    });

    it('should respond with completed orders', () => {
      return request(app.getHttpServer())
        .get('/orders/completed')
        .expect(200)
        .expect([{ id: 3 }]);
    });
  });

  describe('when the GET /orders/:id/status endpoint is called', () => {
    beforeEach(() => {
      getClientStatusMock.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });
    });

    it('should respond with client status', () => {
      return request(app.getHttpServer())
        .get('/orders/1/status')
        .expect(200)
        .expect({ id: 1, status: 'IN_PROGRESS' });
    });
  });

  describe('when the GET /orders/:id/qr endpoint is called', () => {
    beforeEach(() => {
      getQrPayloadMock.mockResolvedValue({
        orderId: 1,
        statusUrl: 'http://example/orders/1',
        qrPayload: 'http://example/orders/1',
      });
    });

    it('should respond with qr payload', () => {
      return request(app.getHttpServer())
        .get('/orders/1/qr')
        .expect(200)
        .expect({
          orderId: 1,
          statusUrl: 'http://example/orders/1',
          qrPayload: 'http://example/orders/1',
        });
    });
  });

  describe('when the POST /orders/:id/items endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .post('/orders/1/items')
          .send({ dishId: 'nope' })
          .expect(400);
      });
    });

    describe('and correct data is provided', () => {
      beforeEach(() => {
        addDishToOrderMock.mockResolvedValue({ id: 10 });
      });

      it('should respond with created/updated order item', () => {
        return request(app.getHttpServer())
          .post('/orders/1/items')
          .send({ dishId: 2, quantity: 1 })
          .expect(201)
          .expect({ id: 10 });
      });
    });
  });

  describe('when the GET /orders/:id/items endpoint is called', () => {
    beforeEach(() => {
      getItemsMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    });

    it('should respond with order items', () => {
      return request(app.getHttpServer())
        .get('/orders/1/items')
        .expect(200)
        .expect([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('when the PATCH /orders/:id/status endpoint is called', () => {
    describe('and incorrect data is provided', () => {
      it('should respond with 400', () => {
        return request(app.getHttpServer())
          .patch('/orders/1/status')
          .send({ status: 'UNKNOWN' })
          .expect(400);
      });
    });

    describe('and correct data is provided', () => {
      beforeEach(() => {
        updateStatusMock.mockResolvedValue({ id: 1, status: 'READY_TO_TAKE' });
      });

      it('should respond with updated order', () => {
        return request(app.getHttpServer())
          .patch('/orders/1/status')
          .send({ status: 'READY_TO_TAKE' })
          .expect(200)
          .expect({ id: 1, status: 'READY_TO_TAKE' });
      });
    });
  });

  describe('when the user is not authenticated', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [
          {
            provide: OrdersService,
            useValue: {
              create: createMock,
              getCurrentForRestaurant: getCurrentMock,
              getCompletedForRestaurant: getCompletedMock,
              getClientStatus: getClientStatusMock,
              getQrPayloadForOrder: getQrPayloadMock,
              addDishToOrder: addDishToOrderMock,
              getOrderItemsForRestaurant: getItemsMock,
              updateStatus: updateStatusMock,
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

    it('should respond with 401 for GET /orders/current', () => {
      return request(app.getHttpServer()).get('/orders/current').expect(401);
    });

    it('should respond with 401 for GET /orders/completed', () => {
      return request(app.getHttpServer()).get('/orders/completed').expect(401);
    });

    it('should respond with 401 for POST /orders', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({ name: 'Table 5', additionalInfo: 'No onions' })
        .expect(401);
    });

    it('should respond with 401 for GET /orders/:id/qr', () => {
      return request(app.getHttpServer()).get('/orders/1/qr').expect(401);
    });

    it('should respond with 401 for POST /orders/:id/items', () => {
      return request(app.getHttpServer())
        .post('/orders/1/items')
        .send({ dishId: 2, quantity: 1 })
        .expect(401);
    });

    it('should respond with 401 for GET /orders/:id/items', () => {
      return request(app.getHttpServer()).get('/orders/1/items').expect(401);
    });

    it('should respond with 401 for PATCH /orders/:id/status', () => {
      return request(app.getHttpServer())
        .patch('/orders/1/status')
        .send({ status: 'READY_TO_TAKE' })
        .expect(401);
    });
  });
});
