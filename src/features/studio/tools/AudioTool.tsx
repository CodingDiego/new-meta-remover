import type { StudioTool } from '@/lib/search-params'

export type AudioToolProps = { tool: StudioTool }

export function AudioTool({ tool }: AudioToolProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Audio
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Pistas, niveles y sincronización de audio ({tool}).
      </p>
    </div>
  )
}
