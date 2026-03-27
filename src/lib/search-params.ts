import {
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs'

/** Editor / studio tools — extend as features land */
const toolValues = [
  'metadata',
  'visual',
  'color',
  'structure',
  'audio',
  'overlays',
  'encode',
] as const

export type StudioTool = (typeof toolValues)[number]

/** Use with `useQueryStates(studioParsers)` on client routes */
export const studioParsers = {
  tool: parseAsStringLiteral(toolValues).withDefault('metadata'),
  job: parseAsString,
  clip: parseAsInteger,
  panel: parseAsString,
  zoom: parseAsFloat.withDefault(1),
}
