/* Luxon fluent API triggers false positives from type-aware ESLint. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

/**
 * Parses `executeAt` into a UTC `Date` for storage and Redis scoring.
 *
 * - If the string includes `Z` or a numeric offset, it is an absolute instant (UTC / offset).
 * - Otherwise `timeZone` (IANA, e.g. `Asia/Dhaka`) is required and the string is treated as
 *   civil local time in that zone (good for clients that mean “3:53 PM here”, not “03:53 UTC”).
 */
export function parseExecuteAtToUtcDate(
  executeAt: string,
  timeZone?: string,
): Date {
  const raw = executeAt.trim();
  if (!raw) {
    throw new BadRequestException('executeAt is required');
  }

  const hasExplicitOffset =
    /Z$/i.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw) || /[+-]\d{4}$/.test(raw);

  if (hasExplicitOffset) {
    const dt = DateTime.fromISO(raw, { setZone: true });
    if (!dt.isValid) {
      throw new BadRequestException(
        `Invalid executeAt: ${dt.invalidExplanation ?? 'unknown'} (${raw})`,
      );
    }
    return dt.toUTC().toJSDate();
  }

  const zone = timeZone?.trim();
  if (!zone) {
    throw new BadRequestException(
      'executeAt has no timezone. Either use UTC with Z (e.g. 2030-06-15T14:30:00.000Z) ' +
        'or send civil local time without Z plus timeZone (IANA), e.g. ' +
        '{"executeAt":"2026-05-10T15:53:00","timeZone":"Asia/Dhaka"} for 3:53 PM in Dhaka.',
    );
  }

  const dt = DateTime.fromISO(raw, { zone });
  if (!dt.isValid) {
    throw new BadRequestException(
      `Invalid executeAt or timeZone: ${dt.invalidExplanation ?? 'unknown'} (executeAt=${raw}, timeZone=${zone})`,
    );
  }
  return dt.toUTC().toJSDate();
}
