import type { ExecutionContext } from '@nestjs/common';
import { UserType } from '../authentication/user-type.enum';

export const mockJwtAuthenticationGuard = {
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 1,
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      restaurantId: 1,
      type: UserType.Restaurant,
    };
    return true;
  },
};
