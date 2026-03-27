import type { ReactNode } from 'react'

type HelpTipProps = {
  /** Short label next to the control */
  children: ReactNode
  /** Longer explanation (native tooltip + screen readers) */
  tip: string
  /** Optional id for aria-describedby */
  id?: string
  className?: string
}

/**
 * Accessible hint: visible label + `title` tooltip + info glyph.
 */
export function HelpTip({ children, tip, id, className = '' }: HelpTipProps) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {children}
      <span
        className="inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-zinc-400/80 text-[10px] font-bold leading-none text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
        title={tip}
        aria-label={tip}
        {...(id ? { id } : {})}
      >
        ?
      </span>
    </span>
  )
}

/** Block label row: term + tip on the right */
export function FieldLabel({
  label,
  tip,
  htmlFor,
}: {
  label: string
  tip: string
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex cursor-pointer items-start justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
    >
      <span>{label}</span>
      <span
        className="shrink-0 cursor-help text-[10px] font-bold leading-none text-zinc-400"
        title={tip}
        aria-label={tip}
      >
        ⓘ
      </span>
    </label>
  )
}
