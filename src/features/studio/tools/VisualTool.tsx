import type { StudioTool } from '@/lib/search-params'

export type VisualToolProps = { tool: StudioTool }

export function VisualTool({ tool }: VisualToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Visual
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Ajustes de apariencia y composición visual del recurso ({tool}).
      </p>
    </div>
  )
}
