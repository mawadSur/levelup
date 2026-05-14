/**
 * Week anchoring helpers.
 *
 * StudyPlan rows are pinned to the Monday 00:00 UTC of their week. The week's
 * target completion is the Sunday 23:59:59.999 UTC of the same week. Keeping
 * the anchor in UTC means a learner crossing timezones (or DST flipping under
 * them) doesn't shift their week boundary.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfUtcDay(d: Date): Date {
  const out = new Date(d.getTime());
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

/**
 * Monday of the ISO week containing `d`, at 00:00:00.000 UTC.
 * getUTCDay returns 0 for Sunday — we shift so Monday=0.
 */
export function mondayOfUtcWeek(d: Date): Date {
  const day = startOfUtcDay(d);
  const dow = day.getUTCDay();
  const offset = (dow + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

/** Returns the next 4 Mondays UTC starting at `mondayOfUtcWeek(from)`. */
export function nextFourMondays(from: Date): Date[] {
  const start = mondayOfUtcWeek(from);
  return [0, 1, 2, 3].map((i) => new Date(start.getTime() + i * 7 * MS_PER_DAY));
}

/** Sunday 23:59:59.999 UTC of the week that starts on `monday`. */
export function endOfWeekFromMonday(monday: Date): Date {
  const end = new Date(monday.getTime() + 6 * MS_PER_DAY);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}
