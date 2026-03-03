export interface PlanConfig {
  monthly: string | undefined
  annual: string | undefined
  trial_days: number
  max_users: number
  trial_max_users?: number
  price_monthly: number
  price_annual: number
  max_docs?: number
}

export const PLANS: Record<string, PlanConfig> = {
  // ── Plan gratuit permanent ──────────────────────────────────────────────
  STARTER: {
    monthly: process.env.STRIPE_STARTER_MONTHLY,
    annual:  process.env.STRIPE_STARTER_ANNUAL,
    trial_days:    0,
    max_users:     1,
    max_docs:      30,
    price_monthly: 0,
    price_annual:  0,
  },

  // ── Indépendant (1 utilisateur) ─────────────────────────────────────────
  BASIQUE_INDEP: {
    monthly: process.env.STRIPE_BASIQUE_INDEP_MONTHLY,
    annual:  process.env.STRIPE_BASIQUE_INDEP_ANNUAL,
    trial_days:    30,
    max_users:     1,
    price_monthly: 12,
    price_annual:  115,
  },
  ESSENTIEL_INDEP: {
    monthly: process.env.STRIPE_ESSENTIEL_INDEP_MONTHLY,
    annual:  process.env.STRIPE_ESSENTIEL_INDEP_ANNUAL,
    trial_days:    30,
    max_users:     1,
    price_monthly: 22,
    price_annual:  211,
  },
  PREMIUM_INDEP: {
    monthly: process.env.STRIPE_PREMIUM_INDEP_MONTHLY,
    annual:  process.env.STRIPE_PREMIUM_INDEP_ANNUAL,
    trial_days:    30,
    max_users:     1,
    price_monthly: 74,
    price_annual:  710,
  },

  // ── TPE (1-5 utilisateurs) ───────────────────────────────────────────────
  BASIQUE_TPE: {
    monthly: process.env.STRIPE_BASIQUE_TPE_MONTHLY,
    annual:  process.env.STRIPE_BASIQUE_TPE_ANNUAL,
    trial_days:    14,
    max_users:     5,
    price_monthly: 27,
    price_annual:  259,
  },
  ESSENTIEL_TPE: {
    monthly: process.env.STRIPE_ESSENTIEL_TPE_MONTHLY,
    annual:  process.env.STRIPE_ESSENTIEL_TPE_ANNUAL,
    trial_days:    14,
    max_users:     5,
    price_monthly: 45,
    price_annual:  432,
  },
  PREMIUM_TPE: {
    monthly: process.env.STRIPE_PREMIUM_TPE_MONTHLY,
    annual:  process.env.STRIPE_PREMIUM_TPE_ANNUAL,
    trial_days:    14,
    max_users:     5,
    price_monthly: 139,
    price_annual:  1334,
  },

  // ── PME (6-15 utilisateurs) ──────────────────────────────────────────────
  BASIQUE_PME: {
    monthly: process.env.STRIPE_BASIQUE_PME_MONTHLY,
    annual:  process.env.STRIPE_BASIQUE_PME_ANNUAL,
    trial_days:    14,
    max_users:     15,
    price_monthly: 45,
    price_annual:  432,
  },
  ESSENTIEL_PME: {
    monthly: process.env.STRIPE_ESSENTIEL_PME_MONTHLY,
    annual:  process.env.STRIPE_ESSENTIEL_PME_ANNUAL,
    trial_days:    14,
    max_users:     15,
    price_monthly: 89,
    price_annual:  854,
  },
  PREMIUM_PME: {
    monthly: process.env.STRIPE_PREMIUM_PME_MONTHLY,
    annual:  process.env.STRIPE_PREMIUM_PME_ANNUAL,
    trial_days:    14,
    max_users:     15,
    price_monthly: 269,
    price_annual:  2582,
  },

  // ── Cabinet (experts-comptables) ─────────────────────────────────────────
  CABINET_ESSENTIEL: {
    monthly: process.env.STRIPE_CABINET_ESSENTIEL_MONTHLY,
    annual:  process.env.STRIPE_CABINET_ESSENTIEL_ANNUAL,
    trial_days:      30,
    max_users:       10,
    trial_max_users: 4,
    price_monthly:   99,
    price_annual:    950,
  },
  CABINET_PREMIUM: {
    monthly: process.env.STRIPE_CABINET_PREMIUM_MONTHLY,
    annual:  process.env.STRIPE_CABINET_PREMIUM_ANNUAL,
    trial_days:      30,
    max_users:       10,
    trial_max_users: 4,
    price_monthly:   179,
    price_annual:    1718,
  },
}

/**
 * Maps a Stripe plan key to the user_profiles.plan value.
 * Handles legacy keys (pro/cabinet/starter) and new keys.
 */
export function mapPlanKeyToProfilePlan(planKey: string): 'starter' | 'cabinet' | 'pro' {
  const k = planKey.toLowerCase()
  if (k === 'starter' || k === 'basique_indep' || k === 'basique_tpe' || k === 'basique_pme') return 'starter'
  if (k === 'cabinet' || k.startsWith('cabinet_')) return 'cabinet'
  return 'pro'
}
