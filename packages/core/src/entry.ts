import { Extra, FSysNode } from "./fsysnodes.js";

export interface EntryBase {
  readonly contentPath: string;
  readonly fsPath: string;
  readonly fsType: 'file' | 'folder';
  readonly link: string;
  readonly title: string | null;
  readonly extra: Extra | null,
  readonly problems: string[],
}

export const createEntryBase = (
  node: FSysNode, title: string | null, problems: string[],
): EntryBase => ({
  contentPath: node.contentPath,
  fsType: node.type,
  fsPath: node.fsPath,
  link: node.name,
  title: node.title ?? title,
  extra: node.extra,
  problems,
});

export interface EntryProblem {
  message: string,
  path: string,
}

export abstract class Entry<ContentType> {
  public readonly base: EntryBase;
  private _parent: ParentEntry<any, this> | null = null;
  private _index: number = -1;

  constructor(base: EntryBase) {
    this.base = base;
  }

  public get link() {
    return this.base.link;
  }

  public get extra() {
    return this.base.extra;
  }

  public get parent(): ParentEntry<any, this> | null {
    return this._parent;
  }

  public set parent(parent: ParentEntry<any, this> | null) {
    this._parent = parent;
  }

  public get index() {
    return this._index;
  }

  public set index(index: number) {
    this._index = index;
  }

  public get problems() {
    return this.base.problems;
  }

  public collectPooblems(): EntryProblem[] {
    return this.problems.map((problem) => ({
      message: problem,
      path: this.base.contentPath,
    }));
  }

  public getBasesPath(): EntryBase[] {
    if (this.parent === null) {
      return [this.base];
    }

    return [...this.parent.getBasesPath(), this.base];
  }

  public find<T extends Entry<unknown>>(entryPath: string, type: EntryClass<T>): T | null {
    const firstSlashIdx = entryPath.indexOf('/');
    const link = firstSlashIdx > -1 ? entryPath.slice(0, firstSlashIdx) : entryPath;
    const subEntry = link === '' ? this : this.findChild(link);
    
    if (subEntry === null) {
      return null;
    }

    if (firstSlashIdx > -1) {
      const subPath = entryPath.slice(firstSlashIdx + 1);
      if (subPath === '') {
        if (subEntry instanceof type) {
          return subEntry;
        }
        return null;
      }

      return subEntry.find(subPath, type);
    }

    if (subEntry instanceof type) {
      return subEntry;
    }
    return null;
  }

  public abstract computeTotalEntries(): number;
  public abstract findChild(link: string): Entry<any> | null;
  public abstract findChildOfType(link: string, type: EntryClass<Entry<unknown>>): Entry<unknown> | null;
  public abstract fetch(): Promise<ContentType>;
}

export abstract class LeafEntry<ContentType> extends Entry<ContentType> {
  constructor(base: EntryBase) {
    super(base);
  }

  public findChild(link: string): null {
    return null;
  }

  public findChildOfType<T extends Entry<any>>(link: string, type: EntryClass<T>): null {
    return null;
  }

  public computeTotalEntries(): number {
    return 0;
  }

  public abstract fetch(): Promise<ContentType>;
}

type Content<E> = E extends Entry<infer C> ? C : never;

export abstract class ParentEntry<ContentType, E extends Entry<any>> extends Entry<ContentType> {
  protected readonly subEntries: readonly E[];

  public constructor(base: EntryBase, subEntries: E[]) {
    super(base);
    this.subEntries = [...subEntries];
    this.subEntries.forEach((subEntry, index) => {
      subEntry.parent = this;
      subEntry.index = index
    });
  }

  public collectPooblems(): EntryProblem[] {
    const thisProblems = this.problems.map((problem): EntryProblem => ({
      message: problem,
      path: this.base.contentPath,
    }));

    const subProblems = this.subEntries.flatMap((subEntry) => subEntry.collectPooblems());

    return [...thisProblems, ...subProblems];
  }

  public findChild(link: string): E | null {
    return this.subEntries.find((entry) => entry.link === link) ?? null;
  }

  public findChildOfType(link: string, type: EntryClass<E>): E | null {
    const subEntry = this.findChild(link);
    if (subEntry === null) {
      return null;
    }

    return subEntry instanceof type ? subEntry : null;
  }

  public async fetchChildren(): Promise<Content<E>[]> {
    return Promise.all(this.subEntries.map((subEntry) => subEntry.fetch()));
  }

  public computeTotalEntries(): number {
    return this.subEntries.reduce(
      (sum, subEntry) => sum + subEntry.computeTotalEntries() + 1, 0
    );
  }

  public getPrevSibling(childIindex: number): E | null {
    if (childIindex <= 0) {
      return null;
    }

    return this.subEntries[childIindex - 1];
  }

  public getNextSibling(childIindex: number): E | null {
    if (childIindex >= this.subEntries.length - 1) {
      return null;
    }

    return this.subEntries[childIindex + 1];
  }

  public abstract fetch(): Promise<ContentType>;
}

export interface RefableEntry<R> {
  getContentRef(): R;
}

export type EntryClass<T extends Entry<any>> = new (...args: any[]) => T;