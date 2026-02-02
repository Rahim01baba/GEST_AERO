/**
 * Unified datetime utilities for consistent timezone handling
 */

export function toUtcISOString(localDate: Date): string {
  return localDate.toISOString();
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';

  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return '-';
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';

  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch (e) {
    return '-';
  }
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '-';

  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return '-';
  }
}
