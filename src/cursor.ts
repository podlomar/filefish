import { IndexEntry, InnerEntry } from "./treeindex.js";

interface PathItem {
  entry: IndexEntry;
  pos: number;
}

export interface Cursor {
  isOk(): this is OkCursor;
  entry(): IndexEntry | null;
  find(fn: (entry: IndexEntry) => boolean): Cursor;
  search(fn: (entry: IndexEntry) => boolean): Cursor;
  children(): OkCursor[];
  path(): readonly PathItem[];
  pos(): number | null;
  contentPath(): string | null;
  navigate(...segments: string[]): Cursor;
  parent(): Cursor;
  root(): Cursor;
  nthSibling(steps: number): Cursor;
  nthChild(index: number): Cursor;
  nextSibling(): Cursor;
  prevSibling(): Cursor;
}

const notFoundCursor: Cursor = {
  isOk: (): false => false,
  entry: (): null => null,
  children: (): OkCursor[] => [],
  find: (): Cursor => notFoundCursor,
  search: (): Cursor => notFoundCursor,
  path: () => [],
  pos: (): null => null,
  contentPath: () => null,
  navigate: (): Cursor => notFoundCursor,
  parent: (): Cursor => notFoundCursor,
  root: (): Cursor => notFoundCursor,
  nthSibling: (): Cursor => notFoundCursor,
  nthChild: (): Cursor => notFoundCursor,
  nextSibling: (): Cursor => notFoundCursor,
  prevSibling: (): Cursor => notFoundCursor,
};

export class OkCursor implements Cursor {
  private readonly treePath: readonly PathItem[];

  public constructor(treePath: readonly PathItem[]) {
    this.treePath = treePath;
  }

  public isOk(): this is OkCursor {
    return true;
  }

  public entry(): IndexEntry {
    return this.treePath.at(-1)?.entry!;
  }

  public children(): OkCursor[] {
    const entry = this.entry();
    if (entry.type !== 'inner') {
      return [];
    }

    return entry.subEntries.map(
      (subEntry, index) => new OkCursor([...this.treePath, { entry: subEntry, pos: index }])
    );
  }

  public find(fn: (entry: IndexEntry) => boolean): Cursor {
    const entry = this.entry();
    if (entry.type !== 'inner') {
      return notFoundCursor;
    }

    const index = entry.subEntries.findIndex(fn);
    if (index === -1) {
      return notFoundCursor;
    }

    return new OkCursor([...this.treePath, { entry: entry.subEntries[index], pos: index }]);
  }

  public search(fn: (entry: IndexEntry) => boolean): Cursor {
    const entry = this.entry();
    if (fn(entry)) {
      return this;
    }
    
    if (entry.type === 'leaf') {
      return notFoundCursor;
    }

    for (const childCursor of this.children()) {
      const cursor = childCursor.search(fn);
      if (cursor.isOk()) {
        return cursor;
      }
    }

    return notFoundCursor;
  }

  public path(): readonly PathItem[] {
    return this.treePath;
  }

  public pos(): number {
    return this.treePath.at(-1)?.pos!;
  }

  public contentPath(): string {
    // NOTE: The first entry is the root entry, which is not part of the content path.
    return '/' + this.treePath.slice(1).map((item) => item.entry.name).join('/');
  }

  public navigate(...segments: string[]): Cursor {
    const startEntry = this.entry();
    
    const steps = segments.flatMap((segment) => segment.split('/'));
    const entryPath: PathItem[] = [];
    let currentEntry = startEntry;
    
    for(const step of steps) {
      if (currentEntry.type !== 'inner') {
        return notFoundCursor;
      }
        
      const index = currentEntry.subEntries.findIndex((e) => e.name === step);
      if (index === -1) {
        return notFoundCursor;
      }
      
      currentEntry = currentEntry.subEntries[index];
      entryPath.push({ entry: currentEntry, pos: index });
    }

    return new OkCursor([...this.treePath, ...entryPath]);
  }

  public parent(): Cursor {
    const parentPath = this.treePath.slice(0, -1);
    if (parentPath.length === 0) {
      return notFoundCursor;
    }

    return new OkCursor(parentPath);
  }

  public root(): Cursor {
    return new OkCursor([this.treePath[0]]);
  }

  public nthSibling(steps: number): Cursor {
    const parentPath = this.treePath.slice(0, -1);
    const parent = parentPath.at(-1)?.entry as InnerEntry | undefined;

    if (parent === undefined) {
      return notFoundCursor;
    }

    const index = parent.subEntries.indexOf(this.entry()) + steps;
    const sibling = parent.subEntries.at(index);

    if (sibling === undefined) {
      return notFoundCursor;
    }

    return new OkCursor([
      ...parentPath,
      {
        entry: sibling,
        pos: index,
      }
    ]);
  }

  public nthChild(index: number): Cursor {
    const entry = this.entry();

    if (entry.type === 'leaf') {
      return notFoundCursor;
    }
    
    const child = entry.subEntries.at(index);
    if (child === undefined) {
      return notFoundCursor;
    }

    return new OkCursor([
      ...this.treePath,
      {
        entry: child,
        pos: index,
      }
    ]);
  }

  public nextSibling(): Cursor {
    return this.nthSibling(1);
  }

  public prevSibling(): Cursor {
    return this.nthSibling(-1);
  }
};
