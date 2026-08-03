import { getGunClient } from './gun-client';
import { getIPFSClient } from './ipfs-client';
import { createIntegrityProof, verifyIntegrityProof } from '../identity/did-manager';

/**
 * Data Synchronization Module
 *
 * Syncs Civizen data types across the P2P network:
 * profiles, proposals, evidence, endorsements, votes.
 */

export interface SyncConfig {
  autoSync?: boolean;
  syncInterval?: number;
  debug?: boolean;
}

export interface SyncableData {
  id: string;
  type: 'profile' | 'proposal' | 'evidence' | 'endorsement' | 'vote';
  owner: string;
  data: unknown;
  timestamp: number;
  signature: string;
}

export type EvidenceSyncPayload = Record<string, unknown> & { fileName: string };

/** Data Synchronization Manager */
export class DataSyncManager {
  private config: SyncConfig;
  private syncQueue: SyncableData[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(config: SyncConfig = {}) {
    this.config = {
      autoSync: config.autoSync !== false,
      syncInterval: config.syncInterval || 5000,
      debug: config.debug || false,
    };
    if (this.config.autoSync) this.startAutoSync();
  }

  private startAutoSync(): void {
    this.syncInterval = setInterval(() => {
      this.processSyncQueue().catch((error) => {
        console.error('[DataSync] Sync error:', error);
      });
    }, this.config.syncInterval);
    if (this.config.debug) console.log('[DataSync] Started auto-sync');
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.config.debug) console.log('[DataSync] Stopped auto-sync');
  }

  async syncProfile(userDID: string, profileData: unknown, privateKey: Uint8Array): Promise<void> {
    try {
      const proof = createIntegrityProof(profileData, userDID, privateKey);
      const syncData: SyncableData = {
        id: `profile:${userDID}`,
        type: 'profile',
        owner: userDID,
        data: profileData,
        timestamp: Date.now(),
        signature: proof.signature,
      };
      this.syncQueue.push(syncData);
      await this.syncToGun(syncData);
      if (this.config.debug) console.log('[DataSync] Queued profile sync for:', userDID);
    } catch (error) {
      console.error('[DataSync] Error syncing profile:', error);
      throw error;
    }
  }

  async syncProposal(
    proposalId: string,
    proposalData: unknown,
    creatorDID: string,
    privateKey: Uint8Array,
  ): Promise<void> {
    try {
      const proof = createIntegrityProof(proposalData, creatorDID, privateKey);
      const syncData: SyncableData = {
        id: `proposal:${proposalId}`,
        type: 'proposal',
        owner: creatorDID,
        data: proposalData,
        timestamp: Date.now(),
        signature: proof.signature,
      };
      this.syncQueue.push(syncData);
      await this.syncToGun(syncData);
      if (this.config.debug) console.log('[DataSync] Queued proposal sync:', proposalId);
    } catch (error) {
      console.error('[DataSync] Error syncing proposal:', error);
      throw error;
    }
  }

  async syncEvidence(
    evidenceId: string,
    evidenceData: EvidenceSyncPayload,
    fileBuffer: Buffer,
    ownerDID: string,
    privateKey: Uint8Array,
  ): Promise<void> {
    try {
      const ipfsClient = getIPFSClient();
      const uploadResult = await ipfsClient.uploadFile(fileBuffer, evidenceData.fileName, ownerDID);
      const evidenceRecord = {
        ...evidenceData,
        ipfsCID: uploadResult.cid,
        fileSize: uploadResult.size,
      };
      const proof = createIntegrityProof(evidenceRecord, ownerDID, privateKey);
      const syncData: SyncableData = {
        id: `evidence:${evidenceId}`,
        type: 'evidence',
        owner: ownerDID,
        data: evidenceRecord,
        timestamp: Date.now(),
        signature: proof.signature,
      };
      this.syncQueue.push(syncData);
      await this.syncToGun(syncData);
      if (this.config.debug) console.log('[DataSync] Queued evidence sync:', evidenceId);
    } catch (error) {
      console.error('[DataSync] Error syncing evidence:', error);
      throw error;
    }
  }

  async syncEndorsement(
    endorsementId: string,
    endorsementData: unknown,
    endorserDID: string,
    privateKey: Uint8Array,
  ): Promise<void> {
    try {
      const proof = createIntegrityProof(endorsementData, endorserDID, privateKey);
      const syncData: SyncableData = {
        id: `endorsement:${endorsementId}`,
        type: 'endorsement',
        owner: endorserDID,
        data: endorsementData,
        timestamp: Date.now(),
        signature: proof.signature,
      };
      this.syncQueue.push(syncData);
      await this.syncToGun(syncData);
      if (this.config.debug) console.log('[DataSync] Queued endorsement sync:', endorsementId);
    } catch (error) {
      console.error('[DataSync] Error syncing endorsement:', error);
      throw error;
    }
  }

  async syncVote(
    voteId: string,
    voteData: unknown,
    voterDID: string,
    privateKey: Uint8Array,
  ): Promise<void> {
    try {
      const proof = createIntegrityProof(voteData, voterDID, privateKey);
      const syncData: SyncableData = {
        id: `vote:${voteId}`,
        type: 'vote',
        owner: voterDID,
        data: voteData,
        timestamp: Date.now(),
        signature: proof.signature,
      };
      this.syncQueue.push(syncData);
      await this.syncToGun(syncData);
      if (this.config.debug) console.log('[DataSync] Queued vote sync:', voteId);
    } catch (error) {
      console.error('[DataSync] Error syncing vote:', error);
      throw error;
    }
  }

  private async syncToGun(syncData: SyncableData): Promise<void> {
    try {
      const gunClient = getGunClient();
      const path = `${syncData.type}s/${syncData.id}`;
      await gunClient.put(path, { ...syncData, syncedAt: Date.now() });
      if (this.config.debug) console.log('[DataSync] Synced to Gun:', path);
    } catch (error) {
      console.error('[DataSync] Error syncing to Gun:', error);
      throw error;
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;
    let batch: SyncableData[] = [];
    try {
      batch = this.syncQueue.splice(0, 10);
      for (const item of batch) await this.syncToGun(item);
      if (this.config.debug) console.log('[DataSync] Processed', batch.length, 'items from sync queue');
    } catch (error) {
      console.error('[DataSync] Error processing sync queue:', error);
      this.syncQueue.unshift(...batch);
    }
  }

  async retrieveData(dataType: string, dataId: string): Promise<SyncableData | null> {
    try {
      const gunClient = getGunClient();
      const path = `${dataType}s/${dataType}:${dataId}`;
      const data = await gunClient.get(path);
      if (!data) return null;
      const syncable = data as unknown as SyncableData;
      const isValid = verifyIntegrityProof(syncable.data, {
        signature: syncable.signature,
        did: syncable.owner,
        timestamp: syncable.timestamp,
        message: JSON.stringify(syncable.data),
      });
      if (!isValid) {
        console.warn('[DataSync] Integrity check failed for:', path);
        return null;
      }
      return syncable;
    } catch (error) {
      console.error('[DataSync] Error retrieving data:', error);
      return null;
    }
  }

  subscribe(dataType: string, callback: (data: unknown) => void): () => void {
    try {
      const gunClient = getGunClient();
      const unsubscribe = gunClient.subscribe(`${dataType}s`, (data) => callback(data));
      if (!this.listeners.has(dataType)) this.listeners.set(dataType, new Set());
      this.listeners.get(dataType)!.add(callback);
      return () => {
        unsubscribe();
        this.listeners.get(dataType)?.delete(callback);
      };
    } catch (error) {
      console.error('[DataSync] Error subscribing:', error);
      return () => {};
    }
  }

  getSyncStatus(): { queueLength: number; isAutoSyncing: boolean } {
    return { queueLength: this.syncQueue.length, isAutoSyncing: this.syncInterval !== null };
  }
}

let globalDataSync: DataSyncManager | null = null;

export function getDataSyncManager(config?: SyncConfig): DataSyncManager {
  if (!globalDataSync) globalDataSync = new DataSyncManager(config);
  return globalDataSync;
}

export function stopDataSync(): void {
  if (globalDataSync) {
    globalDataSync.stopAutoSync();
    globalDataSync = null;
  }
}
