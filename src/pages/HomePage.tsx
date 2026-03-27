import { Link } from 'react-router-dom'

export function HomePage() {
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
