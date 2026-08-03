import Gun from 'gun';
import 'gun/sea';
import 'gun/axe';

/**
 * Gun.js Client for P2P Data Synchronization
 *
 * Gun is a decentralized, real-time database that syncs data between peers.
 * This module provides a wrapper around Gun for Civizen's data storage needs.
 */

export interface GunConfig {
  peers?: string[];
  localStorage?: boolean;
  radix?: boolean;
  debug?: boolean;
}

export type GunData = Record<string, unknown>;

/** Minimal typing for Gun's dynamic chain / ack API. */
interface GunAck { err?: string | boolean }
interface GunNodeData { _?: unknown; [key: string]: unknown }
interface GunChain {
  get: (key: string) => GunChain;
  put: (data: GunData | null, cb?: (ack: GunAck) => void) => GunChain;
  once: (cb: (data: GunNodeData | null | undefined) => void) => GunChain;
  on: (
    eventOrCb: string | ((data: GunNodeData | null | undefined, key?: string) => void),
    cb?: (msg: unknown) => void,
  ) => GunChain;
  map: () => GunChain;
  off: () => void;
  opt?: { peers?: Record<string, number> };
}

/**
 * Gun Client Manager — connections and high-level Gun data access.
 */
export class GunClientManager {
  private gun: GunChain | null = null;
  private config: GunConfig;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private memoryStore: Map<string, GunData> = new Map();

  constructor(config: GunConfig = {}) {
    this.config = {
      peers: config.peers || this.getDefaultPeers(),
      localStorage: config.localStorage !== false,
      radix: config.radix !== false,
      debug: config.debug || false,
    };
    this.initializeGun();
  }

  private getDefaultPeers(): string[] {
    if (process.env.NODE_ENV === 'development') {
      return ['http://localhost:8765/gun'];
    }
    if (process.env.NODE_ENV === 'staging') {
      return ['http://staging-gun.civizen.local:8765/gun'];
    }
    return [];
  }

  private initializeGun(): void {
    try {
      this.gun = Gun({
        peers: this.config.peers,
        localStorage: this.config.localStorage,
        radix: this.config.radix,
        debug: this.config.debug,
      }) as unknown as GunChain;

      this.gun.on('create', (_msg: unknown) => {
        this.isConnected = true;
        if (this.config.debug) console.log('[Gun] Connected to network');
      });
      this.gun.on('in', (msg: unknown) => {
        if (this.config.debug) console.log('[Gun] Received message:', msg);
      });
      this.gun.on('out', (msg: unknown) => {
        if (this.config.debug) console.log('[Gun] Sent message:', msg);
      });
    } catch (error) {
      console.error('Failed to initialize Gun.js:', error);
      this.gun = null;
      this.isConnected = false;
    }
  }

  isNetworkConnected(): boolean {
    return this.isConnected;
  }

  addPeer(peerUrl: string): void {
    if (this.gun?.opt?.peers) {
      this.gun.opt.peers[peerUrl] = 1;
      if (this.config.debug) console.log(`[Gun] Added peer: ${peerUrl}`);
    }
  }

  getPeers(): string[] {
    if (this.gun?.opt?.peers) return Object.keys(this.gun.opt.peers);
    return [];
  }

  private resolvePath(path: string): GunChain {
    const pathParts = path.split('/');
    let reference = this.gun!;
    for (const part of pathParts) reference = reference.get(part);
    return reference;
  }

  /** Store data in Gun at path (e.g. 'users/alice'). */
  async put(path: string, data: GunData): Promise<void> {
    if (!this.gun) {
      this.memoryStore.set(path, data);
      this.listeners.get(path)?.forEach((callback) => callback(data));
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        this.resolvePath(path).put(data, (ack: GunAck) => {
          if (ack.err) reject(new Error(`Failed to put data: ${String(ack.err)}`));
          else {
            if (this.config.debug) console.log(`[Gun] Put data at path: ${path}`);
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Retrieve data from Gun at path. */
  async get(path: string): Promise<GunData | null> {
    if (!this.gun) return this.memoryStore.get(path) ?? null;
    return new Promise((resolve, reject) => {
      try {
        this.resolvePath(path).once((data: GunNodeData | null | undefined) => {
          if (data && data._ === undefined) {
            if (this.config.debug) console.log(`[Gun] Got data from path: ${path}`, data);
            resolve(data as GunData);
          } else {
            resolve(null);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Subscribe to real-time updates; returns unsubscribe. */
  subscribe(path: string, callback: (data: unknown) => void): () => void {
    if (!this.gun) {
      if (!this.listeners.has(path)) this.listeners.set(path, new Set());
      this.listeners.get(path)!.add(callback);
      return () => this.listeners.get(path)?.delete(callback);
    }
    try {
      this.resolvePath(path).on((data: GunNodeData | null | undefined) => {
        if (data && data._ === undefined) callback(data);
      });
      if (!this.listeners.has(path)) this.listeners.set(path, new Set());
      this.listeners.get(path)!.add(callback);
      return () => this.listeners.get(path)?.delete(callback);
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return () => {};
    }
  }

  /** Delete data from Gun at path. */
  async delete(path: string): Promise<void> {
    if (!this.gun) {
      this.memoryStore.delete(path);
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        this.resolvePath(path).put(null, (ack: GunAck) => {
          if (ack.err) reject(new Error(`Failed to delete data: ${String(ack.err)}`));
          else {
            if (this.config.debug) console.log(`[Gun] Deleted data at path: ${path}`);
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /** List keys under a path. */
  async keys(path: string): Promise<string[]> {
    if (!this.gun) {
      const prefix = path.endsWith('/') ? path : `${path}/`;
      return Array.from(this.memoryStore.keys())
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length).split('/')[0])
        .filter((key, index, all) => key && all.indexOf(key) === index);
    }
    return new Promise((resolve, reject) => {
      try {
        const keys: string[] = [];
        this.resolvePath(path).map().on((data: GunNodeData | null | undefined, key?: string) => {
          if (key && data && data._ === undefined) keys.push(key);
        });
        setTimeout(() => resolve(keys), 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  /** Search items under path matching predicate. */
  async search(
    path: string,
    predicate: (item: unknown, key: string) => boolean,
  ): Promise<Array<{ key: string; data: unknown }>> {
    if (!this.gun) {
      const prefix = path.endsWith('/') ? path : `${path}/`;
      return Array.from(this.memoryStore.entries())
        .filter(([key, data]) => key.startsWith(prefix) && predicate(data, key.slice(prefix.length)))
        .map(([key, data]) => ({ key: key.slice(prefix.length), data }));
    }
    return new Promise((resolve, reject) => {
      try {
        const results: Array<{ key: string; data: unknown }> = [];
        this.resolvePath(path).map().on((data: GunNodeData | null | undefined, key?: string) => {
          if (key && data && data._ === undefined && predicate(data, key)) {
            results.push({ key, data });
          }
        });
        setTimeout(() => resolve(results), 500);
      } catch (error) {
        reject(error);
      }
    });
  }

  getNetworkStats(): { peers: number; connected: boolean; uptime: number } {
    return { peers: this.getPeers().length, connected: this.isConnected, uptime: Date.now() };
  }

  close(): void {
    if (this.gun) this.gun.off();
    this.isConnected = false;
    this.listeners.clear();
    if (this.config.debug) console.log('[Gun] Closed connection');
  }
}

let globalGunClient: GunClientManager | null = null;

export function getGunClient(config?: GunConfig): GunClientManager {
  if (!globalGunClient) globalGunClient = new GunClientManager(config);
  return globalGunClient;
}

export function closeGunClient(): void {
  if (globalGunClient) {
    globalGunClient.close();
    globalGunClient = null;
  }
}
