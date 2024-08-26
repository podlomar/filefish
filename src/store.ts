import { FsNode } from "./fsys.js";

export interface EntryAttrs {
  [key: string]: any,
}

export type EntryAccess = 'public' | 'protected';

export interface Agent {
  getPermission(cursor: Cursor): 'open' | 'locked';
}

export const agnosticAgent: Agent = {
  getPermission: () => 'open',
};

export const publicAgent: Agent = {
  getPermission: () => 'locked',
};

export interface StoreEntry {
  source: FsNode,
  name: string,
  path: string,
  schema: string,
  parent: string | null,
  access: EntryAccess,
  title: string,
  mime: string,
  order: number,
  attrs: EntryAttrs,
}

export interface StoreAsset {
  entryPath: string,
  resourcePath: string,
  fsPath: string,
}

export const buldAssetPath = (asset: StoreAsset): string => {
  return `${asset.entryPath}/!asset/${asset.resourcePath}`;
}

export interface FilefishStore {
  findEntry(path: string): Promise<Cursor | 'not-found'>,
  putEntry(entry: StoreEntry): Promise<void>,
  deleteEntry(id: string): Promise<void>,
  findChildren(parentPath: string, entryType?: string): Promise<StoreEntry[]>,
  getNthChild(parentPath: string, index: number): Promise<StoreEntry | 'not-found'>,
  putAsset(asset: StoreAsset): Promise<void>,
  deleteAsset(entryPath: string, resourcePath: string): Promise<void>,
  findAsset(entryPath: string, resourcePath: string): Promise<StoreAsset | 'not-found'>,
}

export class Cursor {
  private readonly ffStore: FilefishStore;
  private readonly agent: Agent;
  private readonly parentPath: readonly StoreEntry[];
  private readonly currentEntry: StoreEntry;

  public constructor(
    store: FilefishStore,
    contentPath: readonly StoreEntry[],
    agent: Agent,
  ) {
    if (contentPath.length === 0) {
      throw new Error('Content path cannot be empty');
    }

    this.ffStore = store;
    this.parentPath = contentPath.slice(0, -1);
    this.currentEntry = contentPath[contentPath.length - 1];
    this.agent = agent;
  }

  public store(): FilefishStore {
    return this.ffStore
  }

  public entry(): StoreEntry {
    return this.currentEntry;
  }

  public permission(): 'open' | 'locked' {
    if (this.currentEntry.access === 'public') {
      return 'open';
    }
    
    return this.agent.getPermission(this);
  }

  public path(): readonly StoreEntry[] {
    return [...this.parentPath, this.currentEntry];
  }

  public contentPath(): string {
    const path = this.path();
    // NOTE: The first entry is the root entry, which is not part of the content path.
    return '/' + path.slice(1).map((entry) => entry.name).join('/');
  }

  public parent(): Cursor | null {
    if (this.parentPath.length === 0) {
      return null;
    }

    return new Cursor(this.ffStore, this.parentPath, this.agent);
  }

  public async children(entryType?: string): Promise<Cursor[]> {
    const entry = this.entry();
    const children = await this.ffStore.findChildren(entry.path, entryType);    
    return children.map(
      (child) => new Cursor(
        this.ffStore,
        [...this.parentPath, this.currentEntry, child],
        this.agent,
      ),
    );
  }

  public root(): StoreEntry {
    if (this.parentPath.length === 0) {
      return this.currentEntry;
    }
    
    return this.parentPath[this.parentPath.length - 1];
  }

  public async getAssetPath(resourcePath: string): Promise<string | null> {
    const asset = await this.ffStore.findAsset(this.entry().path, resourcePath);
    if (asset === 'not-found') {
      return null;
    }

    return buldAssetPath(asset);
  }

  public async nthSibling(steps: number): Promise<Cursor | null> {
    const index = this.currentEntry.order + steps;
    if (index < 0) {
      return null;
    }

    const parent = this.parent();
    if (parent === null) {
      return null;
    }

    const child = await this.store().getNthChild(parent.entry().path, index);
    if (child === 'not-found') {
      return null;
    }

    return new Cursor(this.ffStore, [...this.parentPath, child], this.agent);
  }

  public async prevSibling(): Promise<Cursor | null> {
    return this.nthSibling(-1);
  }

  public async nextSibling(): Promise<Cursor | null> {
    return this.nthSibling(1);
  }
};
