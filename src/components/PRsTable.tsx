import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, BookOpen, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type PR, type PRState } from "@/lib/data"
import { cn } from "@/lib/utils"
import { BallChip, CIChip, FieldChip, StageChip, UserCell } from "./Chips"
import { ColumnFilter } from "./ColumnFilter"
import { FieldColumnFilter } from "./FieldColumnFilter"
import { SearchInput } from "./Filters"

const STAGE_OPTIONS = [
  { value: "none", label: "queued" },
  { value: "1st", label: "1st pass ✓" },
  { value: "2nd", label: "2nd pass ✓" },
  { value: "3rd", label: "3rd pass ✓" },
]

const BALL_OPTIONS = [
  { value: "reviewer", label: "reviewer" },
  { value: "author", label: "author" },
]

const CI_OPTIONS = [
  { value: "success", label: "passing" },
  { value: "failure", label: "failing" },
  { value: "pending", label: "pending" },
  { value: "error", label: "error" },
]

/** Pill-shaped Open / Merged / Closed switcher — same shape language as the
 * theme toggle, just with text + count instead of icons. */
function StateToggle({
  value,
  onChange,
  counts,
}: {
  value: PRState
  onChange: (v: PRState) => void
  counts: Record<PRState, number>
}) {
  const items: { value: PRState; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "merged", label: "Merged" },
    { value: "closed", label: "Closed" },
  ]
  return (
    <div className="inline-flex items-center rounded-full border p-1" role="radiogroup" aria-label="State">
      {items.map((it) => {
        const active = value === it.value
        return (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
            <span
              className={cn(
                "font-mono text-[10px]",
                active ? "text-accent-foreground/70" : "text-muted-foreground/70",
              )}
            >
              {counts[it.value] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function countBy<T>(items: T[], key: (t: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const k = key(it)
    if (k == null) continue
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export function PRsTable({ prs }: { prs: PR[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "ball_in_court", desc: false },
    { id: "age_days", desc: true },
  ])
  const [search, setSearch] = useState("")
  const [state, setState] = useState<PRState>("open")
  const [field, setField] = useState<string | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [ball, setBall] = useState<string | null>(null)
  const [author, setAuthor] = useState<string | null>(null)
  const [dri, setDri] = useState<string | null>(null)
  const [ci, setCi] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim()
    return prs.filter((p) => {
      if (p.state !== state) return false
      if (field) {
        // `__domain:<slug>` means "items in this domain with no subfield" (e.g.
        // anything filed under tasks/other/). Plain slug matches by subfield.
        if (field.startsWith("__domain:")) {
          if (p.domain !== field.slice("__domain:".length)) return false
        } else if (p.subfield !== field) return false
      }
      if (stage && p.review_stage !== stage) return false
      if (ball && p.ball_in_court !== ball) return false
      if (author && p.author.login !== author) return false
      if (dri && p.dri?.login !== dri) return false
      if (ci && (p.ci ?? "") !== ci) return false
      if (needle) {
        const hay =
          `${p.title} ${p.author.login} ${p.dri?.login ?? ""} ${p.field ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [prs, search, state, field, stage, ball, author, dri, ci])

  // Counts come from the FULL unfiltered set so the popover always offers all
  // values; counts reflect availability in the current dataset.
  const fieldCounts = useMemo(() => {
    const c = countBy(prs, (p) => p.subfield)
    // Surface a count for `__domain:<slug>` buckets too so the popover shows
    // "(uncategorized): N" for domains like `other`.
    for (const p of prs) {
      if (!p.subfield && p.domain) {
        const key = `__domain:${p.domain}`
        c[key] = (c[key] ?? 0) + 1
      }
    }
    return c
  }, [prs])
  const authorOptions = useMemo(() => {
    const c = countBy(prs, (p) => p.author.login)
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }))
  }, [prs])
  const driOptions = useMemo(() => {
    const c = countBy(prs, (p) => p.dri?.login ?? null)
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }))
  }, [prs])

  const columns = useMemo<ColumnDef<PR>[]>(
    () => [
      {
        accessorKey: "number",
        header: "#",
        cell: ({ row }) => (
          <a
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:underline"
          >
            {row.original.number}
            <ExternalLink className="h-3 w-3" />
          </a>
        ),
        size: 70,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <a
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium hover:underline"
          >
            {row.original.title}
          </a>
        ),
      },
      {
        accessorKey: "subfield",
        header: () => (
          <FieldColumnFilter value={field} onChange={setField} counts={fieldCounts} />
        ),
        cell: ({ row }) => (
          <FieldChip subfield={row.original.subfield} fallback={row.original.field} />
        ),
      },
      {
        accessorKey: "review_stage",
        header: () => (
          <ColumnFilter
            title="Stage"
            value={stage}
            onChange={setStage}
            options={STAGE_OPTIONS}
          />
        ),
        cell: ({ row }) => <StageChip stage={row.original.review_stage} />,
      },
      {
        accessorKey: "ball_in_court",
        header: () => (
          <ColumnFilter
            title="Action on"
            value={ball}
            onChange={setBall}
            options={BALL_OPTIONS}
          />
        ),
        cell: ({ row }) => <BallChip ball={row.original.ball_in_court} />,
      },
      {
        accessorKey: "dri",
        header: () => (
          <ColumnFilter
            title="DRI"
            value={dri}
            onChange={setDri}
            options={driOptions}
          />
        ),
        cell: ({ row }) => <UserCell user={row.original.dri} />,
      },
      {
        accessorKey: "author",
        header: () => (
          <ColumnFilter
            title="Author"
            value={author}
            onChange={setAuthor}
            options={authorOptions}
          />
        ),
        cell: ({ row }) => <UserCell user={row.original.author} />,
      },
      {
        accessorKey: "ci",
        header: () => (
          <ColumnFilter title="CI" value={ci} onChange={setCi} options={CI_OPTIONS} />
        ),
        cell: ({ row }) => <CIChip ci={row.original.ci} />,
        size: 50,
      },
      {
        accessorKey: "age_days",
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Age <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.age_days
          const stale = d >= 14
          return (
            <span className={stale ? "font-medium text-amber-600" : "text-muted-foreground"}>
              {d}d
            </span>
          )
        },
      },
      {
        accessorKey: "updated_days",
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Last act. <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const d = row.original.updated_days
          return <span className="text-muted-foreground">{d === 0 ? "today" : `${d}d`}</span>
        },
      },
    ],
    [field, stage, ball, dri, author, ci, fieldCounts, driOptions, authorOptions],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const anyFilter = !!(search || field || stage || ball || dri || author || ci)

  // Per-state totals (ignoring other filters) drive the toggle counts so the
  // numbers stay stable as you select inside a state.
  const stateCounts = useMemo(() => {
    const c: Record<PRState, number> = { open: 0, closed: 0, merged: 0 }
    for (const p of prs) c[p.state] = (c[p.state] ?? 0) + 1
    return c
  }, [prs])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="max-w-sm"
        />
        <StateToggle value={state} onChange={setState} counts={stateCounts} />
        {anyFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSearch("")
              setField(null)
              setStage(null)
              setBall(null)
              setAuthor(null)
              setDri(null)
              setCi(null)
            }}
          >
            Clear filters
          </Button>
        )}
        <a
          href="https://github.com/harbor-framework/terminal-bench-science/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Contributing guide
        </a>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No task pull requests match these filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
