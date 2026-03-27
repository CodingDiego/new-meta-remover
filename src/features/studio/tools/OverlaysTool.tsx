import type { StudioTool } from '@/lib/search-params'

export type OverlaysToolProps = { tool: StudioTool }

export function OverlaysTool({ tool }: OverlaysToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Superposiciones
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Texto, marcas de agua y elementos encima del vídeo o imagen ({tool}).
      </p>
    </div>
  )
}
