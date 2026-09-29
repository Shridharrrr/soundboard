import type { SemanticLayer, Filter } from '@vd/shared';

export type ResolutionResult =
  | { ok: true; filters: Filter[] }
  | {
      ok: false;
      error_code: 'ambiguous_value';
      message: string;
      dimension: string;
      input: string;
      candidates: string[];
    }
  | {
      ok: false;
      error_code: 'value_not_found';
      message: string;
      dimension: string;
      input: string;
      valid_values: string[];
    };

/**
 * Resolves spoken or raw filter inputs against semantic layer definitions and synonyms.
 */
export function resolveFilters(
  rawFilters: Filter[],
  semantic: SemanticLayer
): ResolutionResult {
  const resolved: Filter[] = [];

  for (const f of rawFilters) {
    const dimKey = Object.keys(semantic.dimensions).find(
      d => d.toLowerCase() === f.dimension.toLowerCase()
    );

    if (!dimKey) {
      return {
        ok: false,
        error_code: 'value_not_found',
        message: `Unknown dimension "${f.dimension}". Available dimensions: ${Object.keys(semantic.dimensions).join(', ')}`,
        dimension: f.dimension,
        input: f.dimension,
        valid_values: Object.keys(semantic.dimensions),
      };
    }

    const dimDef = semantic.dimensions[dimKey];
    const canonicalValues: string[] = [];

    for (const rawVal of f.values) {
      const inputTrimmed = rawVal.trim().toLowerCase();

      // 1. Exact match against canonical values
      const exactVal = dimDef.values.find(v => v.toLowerCase() === inputTrimmed);
      if (exactVal) {
        canonicalValues.push(exactVal);
        continue;
      }

      // 2. Exact match against synonyms
      let synonymMatch: string | null = null;
      for (const [canonVal, syns] of Object.entries(dimDef.synonyms || {})) {
        if (syns.some(s => s.toLowerCase() === inputTrimmed)) {
          synonymMatch = canonVal;
          break;
        }
      }
      if (synonymMatch) {
        canonicalValues.push(synonymMatch);
        continue;
      }

      // 3. Substring / prefix matches across values and synonyms
      const candidateSet = new Set<string>();

      for (const canonVal of dimDef.values) {
        const cLower = canonVal.toLowerCase();
        if (cLower.startsWith(inputTrimmed) || cLower.includes(inputTrimmed)) {
          candidateSet.add(canonVal);
        }
      }

      for (const [canonVal, syns] of Object.entries(dimDef.synonyms || {})) {
        for (const syn of syns) {
          const sLower = syn.toLowerCase();
          if (sLower.startsWith(inputTrimmed) || sLower.includes(inputTrimmed)) {
            candidateSet.add(canonVal);
          }
        }
      }

      const candidates = Array.from(candidateSet);

      if (candidates.length === 1) {
        canonicalValues.push(candidates[0]);
      } else if (candidates.length > 1) {
        return {
          ok: false,
          error_code: 'ambiguous_value',
          message: `"${rawVal}" matches multiple values for ${dimDef.label}: ${candidates.join(', ')}`,
          dimension: dimKey,
          input: rawVal,
          candidates,
        };
      } else {
        return {
          ok: false,
          error_code: 'value_not_found',
          message: `No matching value found for "${rawVal}" in ${dimDef.label}.`,
          dimension: dimKey,
          input: rawVal,
          valid_values: dimDef.values,
        };
      }
    }

    resolved.push({
      dimension: dimKey,
      values: Array.from(new Set(canonicalValues)),
    });
  }

  return { ok: true, filters: resolved };
}
