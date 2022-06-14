import { FSysNode } from "./fsysnodes.js";

export interface EntryBase {
  readonly fsNode: FSysNode,
  readonly title: string;
}

export abstract class Entry<ContentType> {
  public readonly base: EntryBase;

  constructor(base: EntryBase) {
    this.base = base;
  }

  public get link() {
    return this.base.fsNode.name;
  }

  public find<T extends Entry<any>>(entryPath: string, type: Class<T>): T | null {
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

  public abstract findChild(link: string): Entry<any> | null;
  public abstract findChildOfType<T extends Entry<any>>(link: string, type: Class<T>): T | null;
  public abstract fetch(): Promise<ContentType>;
}

export abstract class LeafEntry<ContentType> extends Entry<ContentType> {
  constructor(base: EntryBase) {
    super(base);
  }

  public findChild(link: string): null {
    return null;
  }

  public findChildOfType<T extends Entry<any>>(link: string, type: Class<T>): null {
    return null;
  }

  public abstract fetch(): Promise<ContentType>;
}

export abstract class ParentEntry<ContentType, C extends Entry<any>> extends Entry<ContentType> {
  protected subEntries: C[];

  constructor(base: EntryBase) {
    super(base);
    this.subEntries = [];
  }

  public pushEntries(...entries: C[]) {
    this.subEntries.push(...entries);
  }

  public findChild(link: string): Entry<any> | null {
    return this.subEntries.find((entry) => entry.link === link) ?? null;
  }

  public findChildOfType<T extends Entry<any>>(link: string, type: Class<T>): T | null {
    const subEntry = this.findChild(link);
    if (subEntry === null) {
      return null;
    }

    return subEntry instanceof type ? subEntry : null;
  }

  // public getChildrenOFTypes<
  //   T extends Class<Entry<any>>[]
  // >(...types: T): InstanceType<T[number]>[] {
  //   return this.subEntries.filter(
  //     (entry) => types.some(
  //       (type) => entry instanceof type
  //     )
  //   ) as InstanceType<T[number]>[];
  // }

  public abstract fetch(): Promise<ContentType>;
}

export interface RefableEntry<R> {
  getContentRef(): R;
}

export type Class<T> = new (...args: any[]) => T;