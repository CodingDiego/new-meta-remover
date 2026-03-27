import {
  Suspense,
  lazy,
  type ComponentType,
  type LazyExoticComponent,
} from 'react'
import type { StudioTool } from '@/lib/search-params'

const STUDIO_TOOLS = [
  'metadata',
  'visual',
  'color',
  'structure',
  'audio',
  'overlays',
  'encode',
] as const satisfies readonly StudioTool[]

function normalizeStudioTool(t: string): StudioTool {
  return STUDIO_TOOLS.includes(t as StudioTool) ? (t as StudioTool) : 'metadata'
}

type ToolPanelProps = { tool: StudioTool }

const MetadataLazy = lazy(() =>
  import('./MetadataTool').then((m) => ({ default: m.MetadataTool })),
)

const VisualLazy = lazy(() =>
  import('./VisualTool').then((m) => ({ default: m.VisualTool })),
)
const ColorLazy = lazy(() =>
  import('./ColorTool').then((m) => ({ default: m.ColorTool })),
)
const StructureLazy = lazy(() =>
  import('./StructureTool').then((m) => ({ default: m.StructureTool })),
)
const AudioLazy = lazy(() =>
  import('./AudioTool').then((m) => ({ default: m.AudioTool })),
)
const OverlaysLazy = lazy(() =>
  import('./OverlaysTool').then((m) => ({ default: m.OverlaysTool })),
)
const EncodeLazy = lazy(() =>
  import('./EncodeTool').then((m) => ({ default: m.EncodeTool })),
)

const lazyByTool: Record<
  StudioTool,
  LazyExoticComponent<ComponentType<ToolPanelProps>>
> = {
  metadata: MetadataLazy,
  visual: VisualLazy,
  color: ColorLazy,
  structure: StructureLazy,
  audio: AudioLazy,
  overlays: OverlaysLazy,
  encode: EncodeLazy,
}

function ToolFallback() {
  return <div className="text-sm text-zinc-500 dark:text-zinc-400">Cargando…</div>
}

export type StudioToolContentProps = { tool: string }

export function StudioToolContent({ tool }: StudioToolContentProps) {
  const normalized = normalizeStudioTool(tool)
  const Panel = lazyByTool[normalized]
  return (
    <Suspense fallback={<ToolFallback />}>
      <Panel tool={normalized} />
    </Suspense>
  )
}
