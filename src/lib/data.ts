export type User = {
  login: string
  avatar_url: string | null
}

export type Domain =
  | "earth-sciences"
  | "life-sciences"
  | "physical-sciences"
  | "mathematical-sciences"

export type PR = {
  number: number
  title: string
  url: string
  is_draft: boolean
  author: User
  domain: Domain | null
  subfield: string | null
  field: string | null
  type: "new task" | "task fix" | "documentation" | "other"
  review_stage: "1st" | "2nd" | "3rd" | "none"
  ball_in_court: "reviewer" | "author" | null
  dri: User | null
  age_days: number
  updated_days: number
  ci: string | null
  created_at: string
  updated_at: string
  labels: string[]
}

export type Proposal = {
  number: number
  proposal_number: number | null
  title: string
  raw_title: string
  url: string
  author: User
  domain: Domain | null
  subfield: string | null
  field: string | null
  status: "approved" | "rejected" | "pending"
  age_days: number
  updated_days: number
  has_pr: boolean
  created_at: string
  updated_at: string
  labels: string[]
}

export type Coverage = Record<
  string,
  Record<string, { merged: number; in_review: number; proposed: number }>
>

export type Stats = {
  open_prs: number
  open_proposals: number
  pending_proposals: number
  needs_reviewer: number
  needs_author: number
}

export type Data = {
  generated_at: string
  upstream: string
  taxonomy: Record<string, Record<string, string[]>>
  field_labels: Record<string, string>
  field_to_domain: Record<string, Domain>
  prs: PR[]
  proposals: Proposal[]
  coverage: Coverage
  stats: Stats
}

export async function loadData(): Promise<Data> {
  const url = `${import.meta.env.BASE_URL}data.json`
  const res = await fetch(url, { cache: "no-cache" })
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  return res.json()
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  "earth-sciences": "Earth",
  "life-sciences": "Life",
  "physical-sciences": "Physical",
  "mathematical-sciences": "Mathematical",
}

export const DOMAIN_COLORS: Record<Domain, string> = {
  "earth-sciences": "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  "life-sciences": "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  "physical-sciences": "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  "mathematical-sciences": "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
}

// Field labels and field→domain mapping are now provided by the data payload
// (discovered from the upstream tasks/ folder tree). A small React context
// exposes them so cells/chips can render without prop-drilling.
