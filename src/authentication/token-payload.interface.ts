import { UserType } from './user-type.enum';

export type TokenSubjectType = UserType;

export interface TokenPayload {
  subjectId: number;
  subjectType: TokenSubjectType;
}
