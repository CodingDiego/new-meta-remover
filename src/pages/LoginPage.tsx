import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="font-serif text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Sign-in
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This app is <strong>client-only</strong>: there is no server API, no
        remote login, and no account database. Use the studio and tools
        directly; all processing runs in your browser.
      </p>
      <Link
        to="/"
        className="text-sm text-zinc-600 underline dark:text-zinc-400"
      >
        ← Home
      </Link>
    </main>
  )
}
