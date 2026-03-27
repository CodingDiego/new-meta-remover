import { useQueryStates } from 'nuqs'
import { Link, useParams } from 'react-router-dom'
import { StudioMediaProvider } from '@/features/studio/StudioMediaProvider'
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

export function StudioPage() {
  const { jobId: jobFromPath } = useParams<{ jobId?: string }>()
  const [{ tool, job: jobFromQuery, clip, panel, zoom }, setStudio] =
    useQueryStates(studioParsers)

  const jobId = jobFromPath ?? jobFromQuery ?? undefined

  return (
    <StudioMediaProvider>
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Studio
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            URL state (nuqs) + optional{' '}
            <code className="text-xs">/studio/:jobId</code>
          </p>
        </div>
        <Link
          to="/"
          className="cursor-pointer text-sm text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/40">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">tool</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">{tool}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">job (path or ?job=)</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">
              {jobId ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">clip</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">
              {clip ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">panel</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">
              {panel ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">zoom</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">{zoom}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            'metadata',
            'visual',
            'color',
            'structure',
            'audio',
            'overlays',
            'encode',
          ] as const
        ).map((t) => (
          <button
            key={t}
            type="button"
            aria-current={tool === t ? 'page' : undefined}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tool === t
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800'
            }`}
            onClick={() => void setStudio({ tool: t })}
          >
            {STUDIO_TOOL_LABEL[t]}
          </button>
        ))}
      </div>

      <StudioToolContent tool={tool} />
    </main>
    </StudioMediaProvider>
  )
}
