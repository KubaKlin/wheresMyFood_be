import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    password: string;
    createdAt: Date;
  };
}


