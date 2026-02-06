import { randomBytes } from 'crypto';

export const generateInviteCode = () => {
  return randomBytes(18).toString('base64url');
};
