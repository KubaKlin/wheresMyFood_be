export type TokenSubjectType = 'restaurant' | 'user';

export interface TokenPayload {
  subjectId: number;
  subjectType: TokenSubjectType;
}
