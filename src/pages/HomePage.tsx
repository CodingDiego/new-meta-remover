import { Link } from 'react-router-dom'

import { formatBytes } from '@/lib/formatBytes'
import { useStudioMedia } from '@/features/studio/useStudioMedia'
import { useStudioProcessQueue } from '@/features/studio/useStudioProcessQueue'

export function HomePage() {
  const { file, items, activeId, mediaHydrated } = useStudioMedia()
  const { runningJob, queuedJobs } = useStudioProcessQueue()

  const queueBusy = runningJob != null || queuedJobs.length > 0

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-white to-zinc-200/80 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <header className="mb-12 text-center sm:mb-16 sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            Privado · en tu navegador
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            New meta remover
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mx-0">
            Quita metadatos y edita vídeo en el cliente. Sin servidor: los
            archivos no salen de tu dispositivo hasta que exportes.
          </p>
        </header>

        {queueBusy ? (
          <div className="mb-8 rounded-xl border border-amber-500/35 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/35 dark:text-amber-100">
            <p className="font-medium">Hay trabajo en la cola de procesamiento</p>
            <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
              {runningJob
                ? `En curso: ${runningJob.label}`
                : `${queuedJobs.length} trabajo${queuedJobs.length !== 1 ? 's' : ''} en espera`}
              . Abre Studio para ver el panel flotante y el avance por archivo.
            </p>
            <Link
              to="/studio"
              className="mt-3 inline-flex text-sm font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-50"
            >
              Ir al Studio →
            </Link>
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            to="/studio"
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-emerald-500/50 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/60 dark:hover:border-emerald-500/40"
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 transition-transform group-hover:scale-110 dark:bg-emerald-400/10" />
            <span className="inline-flex rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              Studio
            </span>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Abrir herramientas
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Metadatos, visual, color, corte, audio, capas y codificación con
              ffmpeg.wasm.
            </p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 group-hover:gap-2 dark:text-emerald-400">
              Entrar
              <span aria-hidden>→</span>
            </span>
          </Link>

          <Link
            to="/auth/login"
            className="group rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 transition-all hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/70"
          >
            <span className="inline-flex rounded-lg bg-zinc-200/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Cuenta
            </span>
            <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Inicio de sesión
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Información sobre acceso (la app sigue siendo principalmente
              cliente).
            </p>
            <span className="mt-5 inline-flex text-sm font-medium text-zinc-700 group-hover:underline dark:text-zinc-300">
              Ver detalles
            </span>
          </Link>
        </div>

        {mediaHydrated && items.length > 0 && file ? (
          <section className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-50/90 p-6 dark:border-emerald-500/25 dark:bg-emerald-950/35">
            <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
              Sesión actual
            </h2>
            <p className="mt-2 text-sm text-emerald-900/90 dark:text-emerald-100/90">
              {items.length === 1
                ? 'Un archivo listo en el editor.'
                : `${items.length} archivos · activo resaltado abajo.`}
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {items.map((it) => (
                <li
                  key={it.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                    it.id === activeId
                      ? 'border-emerald-600 bg-white/80 dark:border-emerald-500 dark:bg-emerald-950/50'
                      : 'border-emerald-200/60 bg-white/50 dark:border-emerald-900/50 dark:bg-emerald-950/25'
                  }`}
                >
                  <span className="min-w-0 truncate font-mono text-emerald-950 dark:text-emerald-50">
                    {it.file.name}
                  </span>
                  <span className="shrink-0 text-xs text-emerald-800/70 dark:text-emerald-300/70">
                    {formatBytes(it.file.size)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-emerald-800/75 dark:text-emerald-300/70">
              Activo: <span className="font-mono">{file.name}</span>
            </p>
            <Link
              className="mt-5 inline-flex rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              to="/studio"
            >
              Continuar en Studio
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  )
}
