import type { StudioTool } from '@/lib/search-params'

export type EncodeToolProps = { tool: StudioTool }

export function EncodeTool({ tool }: EncodeToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Codificación
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Formatos de salida, códec y parámetros de exportación ({tool}).
      </p>
    </div>
  )
}
