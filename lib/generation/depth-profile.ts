/**
 * Depth-tier helpers shared by the outline generator, validator, and scene-content prompts.
 *
 * These describe the cognitive scaffolding contract:
 *   foundation → building → application → synthesis → mastery
 * and provide profile-specific distribution targets so a course can be tuned
 * from a quick overview to a research-level deep-dive.
 */

import type {
  DepthLevel,
  DepthProfile,
  AudienceLevel,
  SceneOutline,
} from '@/lib/types/generation';

export const DEPTH_LEVELS: readonly DepthLevel[] = [
  'foundation',
  'building',
  'application',
  'synthesis',
  'mastery',
] as const;

export const DEFAULT_DEPTH_PROFILE: DepthProfile = 'standard';
export const DEFAULT_AUDIENCE_LEVEL: AudienceLevel = 'intermediate';

/**
 * Target percentage of scenes at each depth tier per course profile.
 * Values per row sum to 100. Used both as the prompt directive and
 * as the validator's expected distribution (with a tolerance).
 */
export const DEPTH_DISTRIBUTION: Record<
  DepthProfile,
  Record<DepthLevel, number>
> = {
  overview: { foundation: 50, building: 30, application: 15, synthesis: 5, mastery: 0 },
  standard: { foundation: 30, building: 35, application: 25, synthesis: 10, mastery: 0 },
  'deep-dive': { foundation: 20, building: 30, application: 30, synthesis: 15, mastery: 5 },
  mastery: { foundation: 15, building: 25, application: 30, synthesis: 20, mastery: 10 },
};

/** Tiers that must declare prerequisiteSceneIds. */
export const TIERS_REQUIRING_PREREQUISITES: ReadonlySet<DepthLevel> = new Set([
  'application',
  'synthesis',
  'mastery',
]);

/** Human-readable summary of the depth profile (injected into prompts). */
export function describeDepthProfile(profile: DepthProfile): string {
  const dist = DEPTH_DISTRIBUTION[profile];
  const parts = DEPTH_LEVELS.filter((l) => dist[l] > 0).map((l) => `${l} ~${dist[l]}%`);
  const summary: Record<DepthProfile, string> = {
    overview: 'Quick survey: prioritize big picture and motivation; minimal advanced material.',
    standard: 'Balanced course: solid foundation, worked examples, some application.',
    'deep-dive':
      'Deep dive: assume basics covered quickly, spend most time on application and synthesis.',
    mastery: 'Mastery / research-level: rigorous derivations, edge cases, novel applications.',
  };
  return `${profile} — ${summary[profile]}\nTarget tier distribution: ${parts.join(', ')}.`;
}

export function describeAudienceLevel(level: AudienceLevel): string {
  const summary: Record<AudienceLevel, string> = {
    beginner:
      'Beginner: assume no prior background. Define every term, use everyday analogies, avoid jargon.',
    intermediate:
      'Intermediate: assume comfortable with prerequisites. Move quickly through basics, focus on mechanisms and application.',
    advanced:
      'Advanced: assume strong background. Skip elementary review entirely; engage with nuance, tradeoffs, and edge cases.',
  };
  return `${level} — ${summary[level]}`;
}

/**
 * Conservative default when the LLM forgets to emit `depthLevel` for a scene.
 * Roughly maps scene order to a tier following the standard distribution.
 */
export function defaultDepthLevelForOrder(order: number, total: number): DepthLevel {
  if (total <= 0) return 'building';
  const pct = order / total;
  if (pct <= 0.3) return 'foundation';
  if (pct <= 0.65) return 'building';
  if (pct <= 0.9) return 'application';
  return 'synthesis';
}

/** Compute actual tier distribution percentages (rounded). */
export function computeDepthDistribution(
  outlines: Pick<SceneOutline, 'depthLevel'>[],
): Record<DepthLevel, number> {
  const dist: Record<DepthLevel, number> = {
    foundation: 0,
    building: 0,
    application: 0,
    synthesis: 0,
    mastery: 0,
  };
  if (outlines.length === 0) return dist;
  for (const o of outlines) {
    const level = (o.depthLevel ?? 'building') as DepthLevel;
    dist[level] += 1;
  }
  for (const k of DEPTH_LEVELS) {
    dist[k] = Math.round((dist[k] / outlines.length) * 100);
  }
  return dist;
}
