import { FsNode } from "./fsys";

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
  path: string,
  fsPath: string,
}

export interface FilefishStore {
  findEntry(path: string): Promise<Cursor | 'not-found'>,
  putEntry(entry: StoreEntry): Promise<void>,
  deleteEntry(id: string): Promise<void>,
  findChildren(parentPath: string): Promise<StoreEntry[]>,
  putAsset(asset: StoreAsset): Promise<void>,
  deleteAsset(path: string): Promise<void>,
  findAsset(path: string): Promise<StoreAsset | 'not-found'>,
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

  public async children(): Promise<Cursor[]> {
    const entry = this.entry();
    const children = await this.ffStore.findChildren(entry.path);
    
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

  // public nthSibling(steps: number): Cursor | null {
  //   const parent = this.parent();
  //   if (parent === null) {
  //     return null;
  //   }

  //   const parentEntry = parent.entry();
  //   const index = parentEntry.subEntries.indexOf(this.entry()) + steps;
  //   const sibling = parentEntry.subEntries[index];

  //   if (sibling === undefined) {
  //     return null;
  //   }

  //   return new Cursor(
  //     this.parentPath,
  //     {
  //       entry: sibling as Entry,
  //       pos: index,
  //     },
  //     this.agent,
  //   );
  // }

  // public nthChild(index: number): Cursor<ChildOf<Entry>> | null {
  //   const entry = this.entry();

  //   if (entry.type === 'leaf') {
  //     return null;
  //   }
    
  //   const child = entry.subEntries.at(index) as ChildOf<Entry> | undefined;
  //   if (child === undefined) {
  //     return null;
  //   }

  //   return new Cursor(
  //     [...this.parentPath, this.current],
  //     {
  //       entry: child,
  //       pos: index,
  //     },
  //     this.agent,
  //   );
  // }

  // public nextSibling(): Cursor<Entry> | null {
  //   return this.nthSibling(1);
  // }

  // public prevSibling(): Cursor<Entry> | null {
  //   return this.nthSibling(-1);
  // }

  // public navigate(...segments: string[]): Cursor | null {
  //   const steps = segments.flatMap((segment) => segment.split('/'));
  //   const parentPath: PathItem[] = [];
  //   let currentItem: PathItem = this.current;
    
  //   for(const step of steps) {
  //     if (currentItem.entry.type !== 'parent') {
  //       return null;
  //     }
        
  //     const index = currentItem.entry.subEntries.findIndex((e) => e.name === step);
  //     if (index === -1) {
  //       return null;
  //     }
      
  //     const entry = currentItem.entry.subEntries[index];
  //     parentPath.push(currentItem);
  //     currentItem = { entry, pos: index };
  //   }

  //   return new Cursor([...this.parentPath, ...parentPath], currentItem, this.agent);
  // }
};
