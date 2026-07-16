// Central application constants — single source of truth.
// Add / rename a value here and TypeScript will surface every usage that needs updating.

// ── User roles ────────────────────────────────────────────────────────────────

export const ROLE = {
  TELEPHONIST: 'telephonist',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const

export type UserRole = typeof ROLE[keyof typeof ROLE]

/** Returns true for both 'admin' and 'superadmin' — the most common permission check */
export function isAdmin(role: string | null | undefined): boolean {
  return role === ROLE.ADMIN || role === ROLE.SUPERADMIN
}

// ── Lead statuses ─────────────────────────────────────────────────────────────

export const STATUS = {
  NEW:             'new',
  CANVA:           'canva',
  PROBABLE:        'probable',
  LIKELY_SALE:     'likely_sale',
  LIKELY_ANTISALE: 'likely_antisale',
  ANOTHER_TIME:    'another_time',
  EMAIL:           'email',
  NOT_BUYING:      'not_buying',
  NO_ANSWER:       'no_answer',
  BOUGHT:          'bought',
  FEW_REVIEWS:     'few_reviews',
  // Trophy-only — never written to contacts.status (which has a DB CHECK constraint that
  // doesn't list these), always to trophy_contact_sessions.status (plain unconstrained text).
  LEFT:            'left',
  RETURN:          'return',
} as const

export type LeadStatus = typeof STATUS[keyof typeof STATUS]

/** Every valid status — for DB IN queries and exhaustive switches */
export const ALL_STATUSES = Object.values(STATUS) as LeadStatus[]

/** Statuses where an expired lock is returned to the pool (no pipeline progress yet) */
export const RELEASABLE_STATUSES: LeadStatus[] = [STATUS.NEW, STATUS.NO_ANSWER, STATUS.NOT_BUYING]

/** Statuses shown in the dialing queue (active leads — not closed/bought) */
export const DIALABLE_STATUSES: LeadStatus[] = [
  STATUS.NEW, STATUS.CANVA, STATUS.PROBABLE, STATUS.LIKELY_SALE, STATUS.LIKELY_ANTISALE, STATUS.ANOTHER_TIME, STATUS.EMAIL, STATUS.NO_ANSWER,
]
