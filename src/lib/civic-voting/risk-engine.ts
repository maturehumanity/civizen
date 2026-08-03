/**
 * Risk engine — velocity, device-farm, GPS-cluster, and impossible-travel signals.
 */

import { haversineDistanceMeters } from './session-windows';
import type { CivicRiskSeverity } from './types';

export type RiskSignal = {
  signalKey: string;
  severity: CivicRiskSeverity;
  score: number;
  detail: Record<string, unknown>;
};

export type RiskEvaluation = {
  signals: RiskSignal[];
  maxSeverity: CivicRiskSeverity;
  aggregateScore: number;
  blockSession: boolean;
};

const SEVERITY_RANK: Record<CivicRiskSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export function maxSeverity(a: CivicRiskSeverity, b: CivicRiskSeverity): CivicRiskSeverity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function detectVelocityAnomaly(input: {
  sessionsInLastHour: number;
  maxPerHour?: number;
}): RiskSignal | null {
  const max = input.maxPerHour ?? 3;
  if (input.sessionsInLastHour <= max) return null;
  return {
    signalKey: 'velocity_sessions',
    severity: input.sessionsInLastHour >= max * 3 ? 'critical' : 'high',
    score: Math.min(1, input.sessionsInLastHour / (max * 3)),
    detail: { sessionsInLastHour: input.sessionsInLastHour, maxPerHour: max },
  };
}

export function detectDeviceFarmSignal(input: {
  distinctProfilesOnFingerprint: number;
  maxProfilesPerDevice?: number;
}): RiskSignal | null {
  const max = input.maxProfilesPerDevice ?? 1;
  if (input.distinctProfilesOnFingerprint <= max) return null;
  return {
    signalKey: 'device_farm',
    severity: input.distinctProfilesOnFingerprint >= 5 ? 'critical' : 'high',
    score: Math.min(1, input.distinctProfilesOnFingerprint / 5),
    detail: {
      distinctProfilesOnFingerprint: input.distinctProfilesOnFingerprint,
      maxProfilesPerDevice: max,
    },
  };
}

export type GpsPoint = { latitude: number; longitude: number; profileId?: string };

export function detectIdenticalGpsCluster(input: {
  points: GpsPoint[];
  radiusMeters?: number;
  minClusterSize?: number;
}): RiskSignal | null {
  const radius = input.radiusMeters ?? 15;
  const minSize = input.minClusterSize ?? 4;
  if (input.points.length < minSize) return null;

  let largest = 1;
  for (let i = 0; i < input.points.length; i += 1) {
    let count = 0;
    for (let j = 0; j < input.points.length; j += 1) {
      if (haversineDistanceMeters(input.points[i], input.points[j]) <= radius) count += 1;
    }
    largest = Math.max(largest, count);
  }

  if (largest < minSize) return null;
  return {
    signalKey: 'gps_cluster',
    severity: largest >= minSize * 2 ? 'critical' : 'medium',
    score: Math.min(1, largest / (minSize * 2)),
    detail: { clusterSize: largest, radiusMeters: radius },
  };
}

export function detectImpossibleTravel(input: {
  from: { latitude: number; longitude: number; at: Date };
  to: { latitude: number; longitude: number; at: Date };
  maxSpeedMetersPerSecond?: number;
}): RiskSignal | null {
  const maxSpeed = input.maxSpeedMetersPerSecond ?? 90; // ~324 km/h ceiling for air/ground mix
  const distance = haversineDistanceMeters(input.from, input.to);
  const elapsedSeconds = Math.max(1, (input.to.at.getTime() - input.from.at.getTime()) / 1000);
  if (elapsedSeconds <= 0 || input.to.at.getTime() < input.from.at.getTime()) {
    return {
      signalKey: 'impossible_travel',
      severity: 'high',
      score: 1,
      detail: { reason: 'time_reversed_or_zero' },
    };
  }
  const speed = distance / elapsedSeconds;
  if (speed <= maxSpeed) return null;
  return {
    signalKey: 'impossible_travel',
    severity: speed > maxSpeed * 2 ? 'critical' : 'high',
    score: Math.min(1, speed / (maxSpeed * 2)),
    detail: {
      distanceMeters: Math.round(distance),
      elapsedSeconds: Math.round(elapsedSeconds),
      speedMetersPerSecond: Number(speed.toFixed(2)),
      maxSpeedMetersPerSecond: maxSpeed,
    },
  };
}

export function evaluateRiskSignals(signals: Array<RiskSignal | null>): RiskEvaluation {
  const present = signals.filter((s): s is RiskSignal => Boolean(s));
  let severity: CivicRiskSeverity = 'info';
  let aggregateScore = 0;
  for (const signal of present) {
    severity = maxSeverity(severity, signal.severity);
    aggregateScore += signal.score;
  }
  aggregateScore = Math.min(1, aggregateScore);
  const blockSession = SEVERITY_RANK[severity] >= SEVERITY_RANK.high || aggregateScore >= 0.85;
  return {
    signals: present,
    maxSeverity: present.length === 0 ? 'info' : severity,
    aggregateScore,
    blockSession,
  };
}
