import { z } from 'zod';

/** One closed set supplies validation and labels without crossing package boundaries. */
export function defineVocabulary<const V extends readonly [string, ...string[]]>(
  values: V,
  labels: Record<V[number], string>,
) {
  return {
    values,
    schema: z.enum(values),
    options: values.map((value) => ({ value, label: labels[value as V[number]] })),
    label: (value: V[number]) => labels[value],
    /** The label of a stored value; a value outside the set shows as itself rather than blank. */
    labelOf: (value: string) => (labels as Record<string, string | undefined>)[value] ?? value,
  };
}
