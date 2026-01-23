import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    createdAt: Date;
    type?: 'restaurant' | 'user';
    restaurantId?: number;
    userId?: number;
  };
}
