import { createContext, useContext, type ReactNode } from "react"

import type { Domain } from "./data"

export type TaxonomyMeta = {
  taxonomy: Record<string, Record<string, string[]>>
  field_labels: Record<string, string>
  field_to_domain: Record<string, Domain>
}

const Ctx = createContext<TaxonomyMeta | null>(null)

export function TaxonomyProvider({
  value,
  children,
}: {
  value: TaxonomyMeta
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTaxonomy(): TaxonomyMeta {
  const v = useContext(Ctx)
  if (!v) throw new Error("useTaxonomy must be used inside <TaxonomyProvider>")
  return v
}

/** Pretty label for a subfield slug — falls back to the slug itself. */
export function useFieldLabel(slug: string | null): string | null {
  const { field_labels } = useTaxonomy()
  if (!slug) return null
  return field_labels[slug] ?? slug
}

/** Parent domain for a subfield slug — null if unknown. */
export function useFieldDomain(slug: string | null): Domain | null {
  const { field_to_domain } = useTaxonomy()
  if (!slug) return null
  return field_to_domain[slug] ?? null
}
