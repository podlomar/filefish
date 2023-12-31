import { IndexEntry, ParentEntry } from "./indexer.js";

interface PathItem<Entry extends IndexEntry> {
  entry: Entry;
  pos: number;
}

export interface Agent {
  getPermission(cursor: Cursor): 'open' | 'locked';
}

export const agnosticAgent: Agent = {
  getPermission: () => 'open',
};

type ChildOf<T extends IndexEntry> = T extends ParentEntry<infer E> ? E : never;

export class Cursor<Entry extends IndexEntry = IndexEntry> {
  private readonly agent: Agent;
  private readonly parentPath: readonly PathItem<IndexEntry>[];
  private readonly current: PathItem<Entry>;

  public constructor(
    parentPath: readonly PathItem<IndexEntry>[],
    current: PathItem<Entry>,
    agent: Agent,
  ) {
    this.parentPath = parentPath;
    this.current = current;
    this.agent = agent;
  }

  public entry(): Entry {
    return this.current.entry;
  }

  public permission(): 'open' | 'locked' {
    if (this.current.entry.access === 'public') {
      return 'open';
    }
    
    return this.agent.getPermission(this);
  }

  public path(): readonly PathItem<IndexEntry>[] {
    return [...this.parentPath, this.current];
  }

  public contentPath(): string {
    const path = this.path();
    // NOTE: The first entry is the root entry, which is not part of the content path.
    return '/' + path.slice(1).map((item) => item.entry.name).join('/');
  }

  public parent(): Cursor<ParentEntry> | null {
    if (this.parentPath.length === 0) {
      return null;
    }

    const parentPath = this.parentPath.slice(0, -1);
    return new Cursor(parentPath, this.parentPath.at(-1)! as PathItem<ParentEntry>, this.agent);
  }

  public children(): Cursor<ChildOf<Entry>>[] {
    const entry = this.entry();
    if (entry.type === 'leaf') {
      return [];
    }
    
    return entry.subEntries.map(
      (subEntry, index) => new Cursor(
        [...this.parentPath, this.current],
        { entry: subEntry as ChildOf<Entry>, pos: index },
        this.agent,
      ),
    );
  }

  public pos(): number {
    return this.current.pos;
  }

  public root(): IndexEntry {
    if (this.parentPath.length === 0) {
      return this.current.entry;
    }
    
    return this.parentPath[this.parentPath.length - 1].entry;
  }

  public nthSibling(steps: number): Cursor<Entry> | null {
    const parent = this.parent();
    if (parent === null) {
      return null;
    }

    const parentEntry = parent.entry();
    const index = parentEntry.subEntries.indexOf(this.entry()) + steps;
    const sibling = parentEntry.subEntries[index];

    if (sibling === undefined) {
      return null;
    }

    return new Cursor(
      this.parentPath,
      {
        entry: sibling as Entry,
        pos: index,
      },
      this.agent,
    );
  }

  public nthChild(index: number): Cursor<ChildOf<Entry>> | null {
    const entry = this.entry();

    if (entry.type === 'leaf') {
      return null;
    }
    
    const child = entry.subEntries.at(index) as ChildOf<Entry> | undefined;
    if (child === undefined) {
      return null;
    }

    return new Cursor(
      [...this.parentPath, this.current],
      {
        entry: child,
        pos: index,
      },
      this.agent,
    );
  }

  public nextSibling(): Cursor<Entry> | null {
    return this.nthSibling(1);
  }

  public prevSibling(): Cursor<Entry> | null {
    return this.nthSibling(-1);
  }

//   public find(fn: (entry: IndexEntry) => boolean): Cursor<ChildOf<Entry>> {
//     const entry = this.entry();
//     if (entry.type !== 'parent') {
//       return notFoundCursor;
//     }

//     const index = entry.subEntries.findIndex(fn);
//     if (index === -1) {
//       return notFoundCursor;
//     }

//     const childEntry = entry.subEntries[index] as ChildOf<Entry>;

//     return new EntryCursor(
//       [...this.parentPath, this.current],
//       { entry: childEntry, pos: index }
//     );
//   }

  public navigate(...segments: string[]): Cursor<IndexEntry> | null {
    const steps = segments.flatMap((segment) => segment.split('/'));
    const parentPath: PathItem<IndexEntry>[] = [];
    let currentItem: PathItem<IndexEntry> = this.current;
    
    for(const step of steps) {
      if (currentItem.entry.type !== 'parent') {
        return null;
      }
        
      const index = currentItem.entry.subEntries.findIndex((e) => e.name === step);
      if (index === -1) {
        return null;
      }
      
      const entry = currentItem.entry.subEntries[index];
      parentPath.push(currentItem);
      currentItem = { entry, pos: index };
    }

    return new Cursor([...this.parentPath, ...parentPath], currentItem, this.agent);
  }
};
