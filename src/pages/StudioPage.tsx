import { Activity, useState } from 'react'
import { useQueryStates } from 'nuqs'
import { Link, useParams } from 'react-router-dom'

import { StudioAssetBar } from '@/features/studio/StudioAssetBar'
import { StudioToolContent } from '@/features/studio/tools'
import { studioParsers, type StudioTool } from '@/lib/search-params'

const STUDIO_TOOL_LABEL: Record<StudioTool, string> = {
  metadata: 'Metadatos',
  visual: 'Visual',
  color: 'Color',
  structure: 'Estructura',
  audio: 'Audio',
  overlays: 'Capas',
  encode: 'Codificar',
}

const TOOLS: StudioTool[] = [
  'metadata',
  'visual',
  'color',
  'structure',
  'audio',
  'overlays',
  'encode',
]

function ToolIcon({ tool }: { tool: StudioTool }) {
  const cls = 'h-4 w-4 shrink-0'
  switch (tool) {
    case 'metadata':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h10M4 18h16" />
        </svg>
      )
    case 'visual':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
        </svg>
      )
    case 'color':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
    case 'structure':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="7" rx="1" />
          <rect x="3" y="14" width="18" height="7" rx="1" />
        </svg>
      )
    case 'audio':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 16v2a2 2 0 002 2h2M4 8V6a2 2 0 012-2h2M20 8V6a2 2 0 00-2-2h-2M20 16v2a2 2 0 01-2 2h-2" />
          <path d="M9 9v6l3-2 3 2V9" />
        </svg>
      )
    case 'overlays':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M7 8h6M7 12h10" />
        </svg>
      )
    case 'encode':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M8 5v14l11-7-11-7z" />
        </svg>
      )
    default:
      return null
  }
}

export function StudioPage() {
  const { jobId: jobFromPath } = useParams<{ jobId?: string }>()
  const [{ tool, job: jobFromQuery, clip, panel, zoom }, setStudio] =
    useQueryStates(studioParsers)

  const jobId = jobFromPath ?? jobFromQuery ?? undefined
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <nav className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <Link
                to="/"
                className="transition-colors hover:text-zinc-300"
              >
                Inicio
              </Link>
              <span aria-hidden>/</span>
              <span className="font-medium text-zinc-300">Studio</span>
              <span aria-hidden>/</span>
              <span className="text-emerald-400/90">
                {STUDIO_TOOL_LABEL[tool]}
              </span>
            </nav>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-white">
              Editor de vídeo
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Herramientas locales · el archivo se mantiene al navegar
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            ← Inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <StudioAssetBar />

        <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-1.5 rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-1.5 shadow-inner">
                {TOOLS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-current={tool === t ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      tool === t
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                    onClick={() => void setStudio({ tool: t })}
                  >
                    <ToolIcon tool={t} />
                    <span>{STUDIO_TOOL_LABEL[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <StudioToolContent tool={tool} />
            </div>
          </div>

          <div className="lg:w-56">
            <button
              type="button"
              onClick={() => setShowDiagnostics((v) => !v)}
              className="mb-2 w-full rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-2 text-left text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
            >
              {showDiagnostics ? '▼' : '▶'} Estado & URL
            </button>
            <Activity
              mode={showDiagnostics ? 'visible' : 'hidden'}
              name="studio-diagnostics"
            >
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs text-zinc-400">
                <p className="mb-2 font-medium text-zinc-500">nuqs (compartido)</p>
                <dl className="grid gap-2 sm:grid-cols-1">
                  <div>
                    <dt className="text-zinc-600">tool</dt>
                    <dd className="font-mono text-emerald-300/90">{tool}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">job</dt>
                    <dd className="break-all font-mono text-zinc-300">
                      {jobId ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">clip</dt>
                    <dd className="font-mono text-zinc-300">{clip ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">panel</dt>
                    <dd className="font-mono text-zinc-300">{panel ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-600">zoom</dt>
                    <dd className="font-mono text-zinc-300">{zoom}</dd>
                  </div>
                </dl>
              </div>
            </Activity>
          </div>
        </div>
      </div>
    </div>
  )
}
