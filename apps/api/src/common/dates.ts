import { config } from '../config';

const MIN = 60_000;

/** Início do dia (00:00 no fuso do negócio) que contém `d`, em UTC. */
export function startOfLocalDay(d: Date = new Date()): Date {
  const local = new Date(d.getTime() + config.utcOffsetMinutes * MIN);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - config.utcOffsetMinutes * MIN);
}

export function endOfLocalDay(d: Date = new Date()): Date {
  return new Date(startOfLocalDay(d).getTime() + 24 * 60 * MIN - 1);
}

export function daysAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * 24 * 60 * MIN);
}

export function hoursAgo(n: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - n * 60 * MIN);
}

/** "YYYY-MM-DD" no fuso do negócio. */
export function localDateKey(d: Date): string {
  return new Date(d.getTime() + config.utcOffsetMinutes * MIN).toISOString().slice(0, 10);
}
