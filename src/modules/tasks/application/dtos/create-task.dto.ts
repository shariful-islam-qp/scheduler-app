import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  /**
   * When to run the task.
   * - Absolute instant: ISO string ending with `Z` or `±hh:mm` / `±hhmm` (e.g. `2030-06-15T14:30:00.000Z`).
   * - Local civil time: no zone suffix, plus `timeZone` (IANA), e.g. `2026-05-10T15:53:00` + `Asia/Dhaka` = 3:53 PM there.
   */
  @IsString()
  @IsNotEmpty()
  executeAt: string;

  /** Required when `executeAt` has no Z/offset — IANA zone, e.g. `Asia/Dhaka`, `America/New_York`. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  timeZone?: string;
}
