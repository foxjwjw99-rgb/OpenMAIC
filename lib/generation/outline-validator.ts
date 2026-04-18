/**
 * Pure-function validators for the post-generation outline.
 *
 * The LLM is good at producing structurally-correct JSON but bad at honoring
 * progression rules consistently. These checks let the pipeline (and tests)
 * detect when an outline violates the depth-scaffolding contract — drop a
 * `synthesis` scene before its prerequisite, miss the foundation tier
 * entirely, or over/under-shoot the requested depth profile.
 *
 * The LLM-as-judge `validateCoverage` (free-text gap detection) is deliberately
 * not in this file — it lives in a follow-up so this module stays free of
 * AI calls and can be reasoned about with plain unit tests.
 */

import type { SceneOutline, DepthProfile, DepthLevel } from '@/lib/types/generation';
import {
  DEPTH_DISTRIBUTION,
  DEPTH_LEVELS,
  TIERS_REQUIRING_PREREQUISITES,
  computeDepthDistribution,
  DEFAULT_DEPTH_PROFILE,
} from './depth-profile';

/** A single violation of the progression contract. */
export interface DepthValidationIssue {
  code:
    | 'EMPTY_OUTLINE'
    | 'FIRST_NOT_FOUNDATION'
    | 'PREREQUISITE_MISSING'
    | 'PREREQUISITE_OUT_OF_ORDER'
    | 'PREREQUISITE_REQUIRED'
    | 'DISTRIBUTION_OFF';
  message: string;
  sceneId?: string;
}

export interface DepthValidationResult {
  ok: boolean;
  issues: DepthValidationIssue[];
  /** Actual tier distribution (percentages summing to ~100). */
  actualDistribution: Record<DepthLevel, number>;
  expectedDistribution: Record<DepthLevel, number>;
}

/**
 * How far each tier's actual % may drift from the target before it's flagged.
 * Generous on purpose — small courses can't hit exact percentages.
 */
const DISTRIBUTION_TOLERANCE_PCT = 20;

/** Validate a generated outline against the depth-scaffolding contract. */
export function validateDepthProgression(
  outlines: SceneOutline[],
  profile: DepthProfile = DEFAULT_DEPTH_PROFILE,
): DepthValidationResult {
  const issues: DepthValidationIssue[] = [];
  const expectedDistribution = DEPTH_DISTRIBUTION[profile];

  if (outlines.length === 0) {
    return {
      ok: false,
      issues: [{ code: 'EMPTY_OUTLINE', message: 'Outline contains no scenes.' }],
      actualDistribution: emptyDistribution(),
      expectedDistribution,
    };
  }

  const sorted = [...outlines].sort((a, b) => a.order - b.order);
  const idToOrder = new Map(sorted.map((o) => [o.id, o.order]));

  // Rule 1: first scene must be foundation
  if (sorted[0].depthLevel && sorted[0].depthLevel !== 'foundation') {
    issues.push({
      code: 'FIRST_NOT_FOUNDATION',
      sceneId: sorted[0].id,
      message: `First scene is "${sorted[0].depthLevel}" but must be "foundation" — students need a starting ramp.`,
    });
  }

  // Rule 2: prerequisites must exist and come earlier
  for (const scene of sorted) {
    const tier = scene.depthLevel ?? 'building';
    const prereqs = scene.prerequisiteSceneIds ?? [];

    if (TIERS_REQUIRING_PREREQUISITES.has(tier) && prereqs.length === 0) {
      issues.push({
        code: 'PREREQUISITE_REQUIRED',
        sceneId: scene.id,
        message: `Scene "${scene.title}" is at tier "${tier}" but declares no prerequisiteSceneIds.`,
      });
    }

    for (const pid of prereqs) {
      const prereqOrder = idToOrder.get(pid);
      if (prereqOrder === undefined) {
        issues.push({
          code: 'PREREQUISITE_MISSING',
          sceneId: scene.id,
          message: `Scene "${scene.title}" references unknown prerequisiteSceneId "${pid}".`,
        });
      } else if (prereqOrder >= scene.order) {
        issues.push({
          code: 'PREREQUISITE_OUT_OF_ORDER',
          sceneId: scene.id,
          message: `Scene "${scene.title}" (order ${scene.order}) references prerequisite "${pid}" with order ${prereqOrder} — prerequisites must come earlier.`,
        });
      }
    }
  }

  // Rule 3: actual distribution roughly matches the profile
  const actualDistribution = computeDepthDistribution(sorted);
  for (const tier of DEPTH_LEVELS) {
    const drift = Math.abs(actualDistribution[tier] - expectedDistribution[tier]);
    if (drift > DISTRIBUTION_TOLERANCE_PCT) {
      issues.push({
        code: 'DISTRIBUTION_OFF',
        message: `Depth tier "${tier}": actual ${actualDistribution[tier]}% vs expected ${expectedDistribution[tier]}% (${profile} profile).`,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    actualDistribution,
    expectedDistribution,
  };
}

function emptyDistribution(): Record<DepthLevel, number> {
  return { foundation: 0, building: 0, application: 0, synthesis: 0, mastery: 0 };
}
