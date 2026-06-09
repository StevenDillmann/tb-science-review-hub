import { cn } from "@/lib/utils"
import { DOMAIN_LABELS, type Coverage, type Domain, type Stats } from "@/lib/data"
import { useTaxonomy } from "@/lib/taxonomy"

export function StatsView({ coverage, stats }: { coverage: Coverage; stats: Stats }) {
  const { taxonomy } = useTaxonomy()
  const KNOWN_ORDER: Domain[] = [
    "earth-sciences",
    "life-sciences",
    "physical-sciences",
    "mathematical-sciences",
  ]
  const domains = (Object.keys(taxonomy) as Domain[]).filter(
    (d) => Object.keys(taxonomy[d]).length > 0,
  )
  const sortedDomains = [
    ...KNOWN_ORDER.filter((d) => domains.includes(d)),
    ...domains.filter((d) => !KNOWN_ORDER.includes(d)),
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Open PRs" value={stats.open_prs} />
        <StatCard
          label="Needs reviewer"
          value={stats.needs_reviewer}
          accent="text-amber-600"
        />
        <StatCard
          label="Needs author"
          value={stats.needs_author}
          accent="text-violet-600"
        />
        <StatCard label="Open proposals" value={stats.open_proposals} />
        <StatCard label="Pending proposals" value={stats.pending_proposals} />
      </div>

      <section className="rounded-lg border">
        <header className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Domain coverage</h2>
          <p className="text-xs text-muted-foreground">
            Merged tasks · open PRs in review · open proposals · gaps (no activity).
          </p>
        </header>
        <div className="divide-y">
          {sortedDomains.map((domain) => (
            <DomainRow
              key={domain}
              domain={domain}
              subfields={Object.keys(taxonomy[domain])}
              coverage={coverage[domain] ?? {}}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold", accent)}>{value}</div>
    </div>
  )
}

function DomainRow({
  domain,
  subfields,
  coverage,
}: {
  domain: Domain
  subfields: string[]
  coverage: Record<string, { merged: number; in_review: number; proposed: number }>
}) {
  const { field_labels } = useTaxonomy()
  return (
    <div className="grid grid-cols-1 gap-4 px-4 py-3 md:grid-cols-[180px_1fr]">
      <div className="font-medium">{DOMAIN_LABELS[domain] ?? domain}</div>
      <div className="grid gap-1">
        {subfields.map((sub) => {
          const c = coverage[sub] ?? { merged: 0, in_review: 0, proposed: 0 }
          const total = c.merged + c.in_review + c.proposed
          return (
            <div key={sub} className="grid grid-cols-[180px_1fr_auto] items-center gap-3 text-sm">
              <span className="font-medium">{field_labels[sub] ?? sub}</span>
              <CoverageBar merged={c.merged} inReview={c.in_review} proposed={c.proposed} />
              <span className="font-mono text-xs text-muted-foreground">
                {c.merged}m · {c.in_review}r · {c.proposed}p {total === 0 && "· gap"}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CoverageBar({
  merged,
  inReview,
  proposed,
}: {
  merged: number
  inReview: number
  proposed: number
}) {
  const total = merged + inReview + proposed
  if (total === 0) {
    return (
      <div className="h-2 rounded bg-muted">
        <div className="h-full w-full rounded bg-[repeating-linear-gradient(45deg,transparent_0,transparent_4px,hsl(var(--muted-foreground)/0.15)_4px,hsl(var(--muted-foreground)/0.15)_8px)]" />
      </div>
    )
  }
  const seg = (n: number) => `${(n / total) * 100}%`
  return (
    <div className="flex h-2 overflow-hidden rounded bg-muted">
      <div className="bg-green-500" style={{ width: seg(merged) }} />
      <div className="bg-amber-400" style={{ width: seg(inReview) }} />
      <div className="bg-sky-400" style={{ width: seg(proposed) }} />
    </div>
  )
}
