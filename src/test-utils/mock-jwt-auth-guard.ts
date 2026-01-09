import type { ExecutionContext } from '@nestjs/common';

export const mockJwtAuthenticationGuard = {
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 1,
      name: 'Test Restaurant',
      email: 'test@restaurant.com',
      password: 'hashed',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    return true;
  },
};
