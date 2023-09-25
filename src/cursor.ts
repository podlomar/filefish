import { Fail, Result } from "monadix/result";
import { ContentType, LoadingContext } from "./content-types.js";
import { LoadError } from "./errors.js";
import { IndexEntry, InnerEntry, ParentEntry } from "./treeindex.js";

interface PathItem {
  entry: IndexEntry;
  pos: number;
}

type ChildOf<T extends IndexEntry> = T extends ParentEntry<infer E> ? E : never;

export interface Cursor {
  load<Content>(
    contentType: ContentType<any, any, Content>, context: LoadingContext,
  ): Promise<Result<Content, LoadError>>;
  loadShallow<ShallowContent>(
    contentType: ContentType<any, any, any, ShallowContent>, context: LoadingContext,
  ): Promise<Result<ShallowContent, LoadError>>;
  // loadChildren<Content>(
  //   contentType: ContentType<any, any, Content>
  // ): Promise<Result<Content, 'forbidden' | 'not-found'>[]>;
  isOk(): this is OkCursor<IndexEntry>;
  entry(): IndexEntry | null;
  find(fn: (entry: IndexEntry) => boolean): Cursor;
  search(fn: (cursor: OkCursor<IndexEntry>) => boolean): Cursor;
  children(): OkCursor<IndexEntry>[];
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
  load: async (): Promise<Fail<'not-found'>> => Result.fail('not-found'),
  loadShallow: async (): Promise<Fail<'not-found'>> => Result.fail('not-found'),
  entry: (): null => null,
  children: (): OkCursor<IndexEntry>[] => [],
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

export class OkCursor<E extends IndexEntry> implements Cursor {
  private readonly treePath: readonly PathItem[];

  public constructor(treePath: readonly PathItem[]) {
    this.treePath = treePath;
  }

  public isOk(): this is OkCursor<E> {
    return true;
  }

  public async load<Content>(
    contentType: ContentType<any, any, Content>, context: LoadingContext,
  ): Promise<Result<Content, LoadError>> {
    if (!contentType.fits(this)) {
      return Result.fail('not-found');
    }

    return contentType.loadOne(this, context);
  }

  public async loadShallow<ShallowContent>(
    contentType: ContentType<any, any, any, ShallowContent>, context: LoadingContext,
  ): Promise<Result<ShallowContent, LoadError>> {
    if (!contentType.fits(this)) {
      return Result.fail('not-found');
    }

    return contentType.loadShallowOne(this, context);
  }

  public entry(): E {
    return this.treePath.at(-1)?.entry! as E;
  }

  public children(): OkCursor<ChildOf<E>>[] {
    const entry = this.entry();
    if (entry.type === 'leaf') {
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

  public search(fn: (cursor: OkCursor<IndexEntry>) => boolean): Cursor {
    if (fn(this)) {
      return this;
    }
    
    if (this.entry().type === 'leaf') {
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
    const startEntry: IndexEntry = this.entry();
    
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
    const sibling = parent.subEntries[index];

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
