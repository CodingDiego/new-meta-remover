import * as z from 'zod'

const envSchema = z.object({
  MODE: z.string(),
  DEV: z.boolean(),
  PROD: z.boolean(),
})

export type ClientEnv = z.infer<typeof envSchema>

let cached: ClientEnv | null = null

/**
 * Validated Vite `import.meta.env` (client bundle).
 * Call once at startup; throws if schema fails.
 */
export function getEnv(): ClientEnv {
  if (cached) return cached
  cached = envSchema.parse({
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  })
  return cached
}
