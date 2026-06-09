import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, Check, ExternalLink, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type Proposal } from "@/lib/data"
import { FieldChip, StatusChip, UserCell } from "./Chips"
import { ColumnFilter } from "./ColumnFilter"
import { FieldColumnFilter } from "./FieldColumnFilter"
import { SearchInput } from "./Filters"

const STATUS_OPTIONS = [
  { value: "pending", label: "pending" },
  { value: "approved", label: "approved" },
  { value: "rejected", label: "rejected" },
]

const HAS_PR_OPTIONS = [
  { value: "yes", label: "has PR" },
  { value: "no", label: "no PR yet" },
]

function countBy<T>(items: T[], key: (t: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {}
  for (const it of items) {
    const k = key(it)
    if (k == null) continue
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export function ProposalsTable({ proposals }: { proposals: Proposal[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "age_days", desc: false },
  ])
  const [search, setSearch] = useState("")
  const [field, setField] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [hasPR, setHasPR] = useState<string | null>(null)
  const [author, setAuthor] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = search.toLowerCase().trim()
    return proposals.filter((p) => {
      if (field && p.subfield !== field) return false
      if (status && p.status !== status) return false
      if (hasPR === "yes" && !p.has_pr) return false
      if (hasPR === "no" && p.has_pr) return false
      if (author && p.author.login !== author) return false
      if (needle) {
        const hay = `${p.title} ${p.author.login} ${p.field ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [proposals, search, field, status, hasPR, author])

  const fieldCounts = useMemo(() => countBy(proposals, (p) => p.subfield), [proposals])
  const authorOptions = useMemo(() => {
    const c = countBy(proposals, (p) => p.author.login)
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }))
  }, [proposals])

  const columns = useMemo<ColumnDef<Proposal>[]>(
    () => [
      {
        accessorKey: "proposal_number",
        header: "#",
        cell: ({ row }) => (
          <a
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:underline"
          >
            {row.original.proposal_number ?? row.original.number}
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
        accessorKey: "status",
        header: () => (
          <ColumnFilter
            title="Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
        ),
        cell: ({ row }) => <StatusChip status={row.original.status} />,
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
        accessorKey: "has_pr",
        header: () => (
          <ColumnFilter
            title="PR?"
            value={hasPR}
            onChange={setHasPR}
            options={HAS_PR_OPTIONS}
          />
        ),
        cell: ({ row }) =>
          row.original.has_pr ? (
            <Check className="h-4 w-4 text-green-600" aria-label="has PR" />
          ) : (
            <X className="h-4 w-4 text-muted-foreground" aria-label="no PR yet" />
          ),
        size: 60,
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
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.age_days}d</span>
        ),
      },
    ],
    [field, status, hasPR, author, fieldCounts, authorOptions],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const anyFilter = !!(search || field || status || hasPR || author)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search title, author, field…"
          className="max-w-md"
        />
        {anyFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSearch("")
              setField(null)
              setStatus(null)
              setHasPR(null)
              setAuthor(null)
            }}
          >
            Clear filters
          </Button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {proposals.length} proposals
        </div>
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
                  No proposals match these filters.
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
