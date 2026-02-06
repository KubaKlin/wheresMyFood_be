import { Request } from 'express';
import { UserType } from './user-type.enum';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    createdAt: Date;
    type?: UserType;
    restaurantId?: number;
    userId?: number;
  };
}
