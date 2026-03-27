import type { StudioTool } from '@/lib/search-params'

export type StructureToolProps = { tool: StudioTool }

export function StructureTool({ tool }: StructureToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Estructura
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Organización de capas, cortes y jerarquía del proyecto ({tool}).
      </p>
    </div>
  )
}
