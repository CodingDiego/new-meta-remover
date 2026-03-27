import type { StudioTool } from '@/lib/search-params'

export type ColorToolProps = { tool: StudioTool }

export function ColorTool({ tool }: ColorToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Color
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Corrección de color y espacios de color ({tool}).
      </p>
    </div>
  )
}
