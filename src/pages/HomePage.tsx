import { Link } from 'react-router-dom'

import { formatBytes } from '@/lib/formatBytes'
import { useStudioMedia } from '@/features/studio/useStudioMedia'

export function HomePage() {
  const { file, mediaHydrated } = useStudioMedia()

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New meta remover
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Strip metadata and edit media in the browser. No server — files stay
          on your device unless you export them.
        </p>
      </div>

      {mediaHydrated && file ? (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-50/90 p-5 dark:border-emerald-500/25 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Tienes un archivo en el editor
          </p>
          <p className="mt-1 truncate font-mono text-sm text-emerald-800 dark:text-emerald-200/90">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">
            {formatBytes(file.size)} · se conserva al volver a Studio
          </p>
          <Link
            className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            to="/studio"
          >
            Continuar en Studio
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
          Get started
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Open the studio to pick tools and process files locally (e.g.
          metadata in the <em>metadata</em> tool).
        </p>
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          to="/studio"
        >
          Open studio
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          to="/auth/login"
        >
          About sign-in
        </Link>
      </nav>
    </main>
  )
}
