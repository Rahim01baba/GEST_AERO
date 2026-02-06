export const APP_NAME = 'Airport Manager';

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 10,
} as const;

export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  FILTER: 500,
} as const;

export const MAX_FILE_SIZE = {
  AVATAR: 2 * 1024 * 1024,
  DOCUMENT: 10 * 1024 * 1024,
  IMPORT: 5 * 1024 * 1024,
} as const;

export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy HH:mm',
  DATE_ONLY: 'dd/MM/yyyy',
  TIME_ONLY: 'HH:mm',
  ISO: 'yyyy-MM-dd',
} as const;

export const MESSAGES = {
  SUCCESS: {
    CREATED: 'Créé avec succès',
    UPDATED: 'Mis à jour avec succès',
    DELETED: 'Supprimé avec succès',
    SAVED: 'Enregistré avec succès',
  },
  ERROR: {
    GENERIC: 'Une erreur est survenue',
    NETWORK: 'Erreur de connexion',
    NOT_FOUND: 'Élément introuvable',
    PERMISSION: 'Vous n\'avez pas les permissions nécessaires',
    VALIDATION: 'Données invalides',
    REQUIRED_FIELD: 'Ce champ est requis',
  },
  CONFIRM: {
    DELETE: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
    CANCEL: 'Êtes-vous sûr de vouloir annuler ?',
  },
} as const;

export const MOVEMENT_STATUS_LABELS: Record<string, string> = {
  Planned: 'Planifié',
  Approche: 'En approche',
  Posé: 'Posé',
  Enregistrement: 'Enregistrement',
  Décollé: 'Décollé',
  Annulé: 'Annulé',
  Reporté: 'Reporté',
  Arrived: 'Arrivé',
  Departed: 'Parti',
  Canceled: 'Annulé',
} as const;

export const TRAFFIC_TYPE_LABELS: Record<string, string> = {
  NAT: 'National',
  INT: 'International',
} as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  ATS: 'ATS',
  OPS: 'Opérations',
  AIM: 'AIM',
  FIN: 'Finance',
} as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  ISSUED: 'Émise',
  PAID: 'Payée',
  CANCELED: 'Annulée',
} as const;

export const CURRENCY = {
  DEFAULT: 'XOF',
  EUR_XOF_RATE: 655.957,
} as const;

export const BILLING = {
  FREE_PARKING_HOURS: 2,
  PARKING_RATE_PER_TONNE_HOUR: 33,
} as const;

export const QUERY_KEYS = {
  MOVEMENTS: 'movements',
  MOVEMENT: 'movement',
  STANDS: 'stands',
  STAND: 'stand',
  AIRCRAFTS: 'aircrafts',
  AIRCRAFT: 'aircraft',
  USERS: 'users',
  USER: 'user',
  AIRPORTS: 'airports',
  AIRPORT: 'airport',
  INVOICES: 'invoices',
  INVOICE: 'invoice',
  BILLING_SETTINGS: 'billing_settings',
  AUDIT_LOGS: 'audit_logs',
} as const;
