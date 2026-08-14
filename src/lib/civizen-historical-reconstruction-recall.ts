/** Reconstruction recall: attach surviving implemented work; do not score prompts. */

import {
  type DevelopmentStoryEvidenceInput,
} from '@/lib/civizen-development-evidence';
import { evaluateDevelopmentSignificance } from '@/lib/civizen-development-significance';
import { historicalHumanRolesFromProvenance } from '@/lib/civizen-human-contribution-substance';
import { classifyHumanProvenanceText } from '@/lib/civizen-contribution-provenance';
import {
  distinctiveTerms,
  inferSurvivingPaths,
  primaryPaths,
  type HistoricalCommit,
} from '@/lib/civizen-historical-reconstruction-signals';
import type { HistoricalReconstructedOutcome } from '@/lib/civizen-historical-reconstruction';

export type ReconstructionRecallBucket =
  | 'attached_to_outcome'
  | 'provenance_only'
  | 'unreconstructed_with_surviving_implementation'
  | 'process_or_non_contributory';

export type ReconstructionRecallRow = {
  storyId: string;
  bucket: ReconstructionRecallBucket;
  substantive: boolean;
  survivingPathCount: number;
};

export function classifyReconstructionRecall(args: {
  stories: DevelopmentStoryEvidenceInput[];
  outcomes: HistoricalReconstructedOutcome[];
  survivingPaths: string[];
}): ReconstructionRecallRow[] {
  const attached = new Set(args.outcomes.flatMap((item) => item.storyIds));
  return args.stories.map((story) => {
    const id = story.id || story.sourceStoryKey || '';
    const instruction = story.originalInstruction || story.title || '';
    const classified = classifyHumanProvenanceText(instruction);
    const paths = inferSurvivingPaths(instruction, args.survivingPaths);
    if (classified.disposition === 'process_casual' && !classified.contributionBearing) {
      return { storyId: id, bucket: 'process_or_non_contributory', substantive: false, survivingPathCount: paths.length };
    }
    if (attached.has(id)) {
      return {
        storyId: id,
        bucket: 'attached_to_outcome',
        substantive: classified.contributionBearing,
        survivingPathCount: paths.length,
      };
    }
    if (classified.contributionBearing && paths.length >= 3) {
      return {
        storyId: id,
        bucket: 'unreconstructed_with_surviving_implementation',
        substantive: true,
        survivingPathCount: paths.length,
      };
    }
    return {
      storyId: id,
      bucket: classified.contributionBearing ? 'provenance_only' : 'process_or_non_contributory',
      substantive: classified.contributionBearing,
      survivingPathCount: paths.length,
    };
  });
}

function disjoint(paths: string[], occupied: Set<string>): boolean {
  const primary = primaryPaths(paths);
  return primary.length > 0 && primary.every((path) => !occupied.has(path));
}

export function recoverUnlinkedSurvivingOutcomes(args: {
  stories: DevelopmentStoryEvidenceInput[];
  outcomes: HistoricalReconstructedOutcome[];
  survivingPaths: string[];
  commits?: HistoricalCommit[];
}): HistoricalReconstructedOutcome[] {
  const occupied = new Set(args.outcomes.flatMap((item) => primaryPaths(item.affectedPaths)));
  const attached = new Set(args.outcomes.flatMap((item) => item.storyIds));
  const recovered: HistoricalReconstructedOutcome[] = [];
  for (const story of args.stories) {
    const id = story.id || story.sourceStoryKey || '';
    if (!id || attached.has(id)) continue;
    const instruction = story.originalInstruction || story.title || '';
    if (!classifyHumanProvenanceText(instruction).contributionBearing) continue;
    const paths = inferSurvivingPaths(instruction, args.survivingPaths);
    const productPaths = primaryPaths(paths).filter((path) => args.survivingPaths.includes(path));
    if (productPaths.length < 3 || !disjoint(productPaths, occupied)) continue;
    const title = (story.title || instruction).replace(/\.$/, '').slice(0, 120);
    const roles = historicalHumanRolesFromProvenance(instruction);
    const significance = evaluateDevelopmentSignificance({
      affectedPaths: paths,
      testsPassed: story.testsPassed === true,
      title,
      roles,
      implementationAssisted: true,
    });
    const sha = (story.commitSha ?? '').trim().toLowerCase();
    const outcome: HistoricalReconstructedOutcome = {
      result: 'reconstructed_with_uncertainty',
      reconstructionConfidence: 'moderate',
      contributionEvidenceConfidence: story.testsPassed === true ? 'high' : 'moderate',
      attributionConfidence: sha.length >= 7 ? 'moderate' : 'unknown',
      outcomeRootId: `historical:recall:${id.slice(0, 24)}`,
      title,
      instruction,
      createdFeatures: [title, ...paths.slice(0, 4)],
      affectedPaths: paths.slice(0, 40),
      survivingPaths: paths,
      commitShas: sha.length >= 7 ? [sha] : [],
      storyIds: [id],
      linkReasons: ['recall_surviving_implementation', ...distinctiveTerms(title).slice(0, 3)],
      testsPassed: story.testsPassed === true ? true : null,
      survivingImplementation: true,
      implementationStory: {
        id: `outcome:recall:${id}:implementation`,
        sourceStoryKey: `outcome:recall:${id}:implementation`,
        source: 'historical_reconstruction',
        sourceType: 'outcome',
        status: 'published',
        title,
        originalInstruction: instruction,
        createdFeatures: [title, ...paths.slice(0, 4)],
        commitSha: sha.length >= 7 ? sha : null,
        metadata: {
          historicalReconstruction: true,
          survivingImplementation: true,
          reconstructionResult: 'reconstructed_with_uncertainty',
          affectedPaths: paths.slice(0, 40),
          contributionFunction: significance.contributionFunction,
          captureVersion: 'historical-reconstruction-recall-v1',
          roles,
          linkedInstructions: [instruction],
          implementationAssisted: true,
        },
        outcomeRootId: `historical:recall:${id.slice(0, 24)}`,
        testsPassed: story.testsPassed === true,
        requestedAt: story.requestedAt || story.createdAt || undefined,
        roles,
        implementationAssisted: true,
      },
    };
    recovered.push(outcome);
    for (const path of primaryPaths(paths)) occupied.add(path);
    attached.add(id);
  }
  return recovered;
}
