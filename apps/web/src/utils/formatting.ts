/**
 * String and data formatting utilities for the web app
 */

import { strandOptions, type DayOfWeek, type Teacher } from '@school-scheduler/shared';

export function normalizeSearchText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function includesSearch(value: string | null | undefined, searchTerm: string) {
  return normalizeSearchText(value).includes(normalizeSearchText(searchTerm));
}

export function parseAllowedStrands(value: string | null | undefined) {
  return (value ?? '')
    .split(/[\n,]+/)
    .map((strand) => normalizeSearchText(strand))
    .filter(Boolean);
}

export function formatAllowedStrands(value: string | null | undefined) {
  return parseAllowedStrands(value).length > 0 ? value ?? '' : 'All strands';
}

export function normalizeStrandSelections(value: string | null | undefined) {
  const selectedStrands = parseAllowedStrands(value);
  const normalizedSelections = strandOptions.filter((strand) =>
    selectedStrands.includes(normalizeSearchText(strand))
  );

  return normalizedSelections.join(', ');
}

export function toggleAllowedStrand(currentValue: string, strand: string) {
  const selectedStrands = new Set(parseAllowedStrands(currentValue));
  const normalizedStrand = normalizeSearchText(strand);

  if (selectedStrands.has(normalizedStrand)) {
    selectedStrands.delete(normalizedStrand);
  } else {
    selectedStrands.add(normalizedStrand);
  }

  return strandOptions
    .filter((option) => selectedStrands.has(normalizeSearchText(option)))
    .join(', ');
}

export function toggleSelectedId(currentIds: string[], id: string) {
  return currentIds.includes(id)
    ? currentIds.filter((currentId) => currentId !== id)
    : [...currentIds, id];
}

export function normalizeStrandOption(value: string | null | undefined) {
  const normalizedValue = normalizeSearchText(value);
  return strandOptions.find((strand) => normalizeSearchText(strand) === normalizedValue) ?? '';
}

export function formatTeacherName(
  teacher: Pick<Teacher, 'firstName' | 'lastName'> & { middleInitial?: string | null; title?: string | null }
) {
  return `${teacher.title ? `${teacher.title} ` : ''}${teacher.firstName}${teacher.middleInitial ? ` ${teacher.middleInitial}` : ''} ${teacher.lastName}`;
}

export function formatDay(day: DayOfWeek) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}
