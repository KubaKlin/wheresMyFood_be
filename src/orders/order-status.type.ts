export const ORDER_STATUSES = ['IN_PROGRESS', 'READY_TO_TAKE'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
