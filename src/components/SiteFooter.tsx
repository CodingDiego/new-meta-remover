import { REPO_CONTRIBUTING_URL, REPO_URL } from '@/lib/repo'

export function SiteFooter() {
  return (
    <footer
      className="border-t border-zinc-200/80 bg-zinc-50/90 py-4 text-center text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-400"
      role="contentinfo"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-800 underline-offset-2 transition-colors hover:text-emerald-700 hover:underline dark:text-zinc-200 dark:hover:text-emerald-400"
        >
          GitHub
        </a>
        <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600" aria-hidden>
          ·
        </span>
        <a
          href={REPO_CONTRIBUTING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-800 underline-offset-2 transition-colors hover:text-emerald-700 hover:underline dark:text-zinc-200 dark:hover:text-emerald-400"
        >
          Contribuir
        </a>
        <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600" aria-hidden>
          ·
        </span>
        <span className="text-zinc-500 dark:text-zinc-500">Código abierto</span>
      </div>
    </footer>
  )
}
