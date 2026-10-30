export const INDIA_TIME_ZONE = 'Asia/Kolkata';

type IndianTime = {
  hour: number;
  minute: number;
  second: number;
};

function getIndianTime(date: Date): IndianTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    second: '2-digit',
    timeZone: INDIA_TIME_ZONE,
  }).formatToParts(date);

  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    hour: valueFor('hour'),
    minute: valueFor('minute'),
    second: valueFor('second'),
  };
}

export function getIstGreeting(date = new Date(), firstName?: string | null) {
  const { hour } = getIndianTime(date);
  const salutation = hour >= 5 && hour < 12
    ? 'Good Morning'
    : hour >= 12 && hour < 17
      ? 'Good Afternoon'
      : hour >= 17 && hour < 22
        ? 'Good Evening'
        : 'Welcome Back';
  const name = firstName?.trim();

  return name ? `${salutation}, ${name}!` : salutation;
}

/** Delay until the next IST greeting period starts, with a tiny safety buffer. */
export function getMillisecondsUntilNextIstGreeting(date = new Date()) {
  const { hour, minute, second } = getIndianTime(date);
  const nextBoundaryHour = hour < 5 ? 5 : hour < 12 ? 12 : hour < 17 ? 17 : hour < 22 ? 22 : 5;
  const hoursUntilBoundary = (nextBoundaryHour - hour + 24) % 24;
  const secondsUntilBoundary = ((hoursUntilBoundary * 60 - minute) * 60) - second;

  return Math.max(1_000, (secondsUntilBoundary * 1_000) - date.getMilliseconds() + 100);
}
