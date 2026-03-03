import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const STATISTICS_RANGES = ['today', '7d', '30d'] as const;
export type StatisticsRange = (typeof STATISTICS_RANGES)[number];

export class StatisticsRangeDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(STATISTICS_RANGES)
  range: StatisticsRange;
}
