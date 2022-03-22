import { Content } from './content.js';

export interface EntryBase {
  readonly link: string;
  readonly title: string;
}

export abstract class Entry<
  ContentType extends Content<string, any, any>
  > {
  public readonly base: EntryBase;
  public readonly contentType: ContentType['type'];

  protected subEntries: Entry<any>[];

  constructor(base: EntryBase, contentType: ContentType['type']) {
    this.base = base;
    this.contentType = contentType;
    this.subEntries = [];
  }

  public pushEntries(...entries: Entry<any>[]) {
    this.subEntries.push(...entries);
  }

  public find(entryPath: string): Entry<any> | null {
    const firstSlashIdx = entryPath.indexOf('/');
    const link = firstSlashIdx > -1 ? entryPath.slice(0, firstSlashIdx) : entryPath;
    const subEntry = link === '' ? this : this.findChild(link);
    if (subEntry === null) {
      return null;
    }

    if (firstSlashIdx > -1) {
      const subPath = entryPath.slice(firstSlashIdx + 1);
      if (subPath === '') {
        return subEntry;
      }

      return subEntry.find(subPath);
    }

    return subEntry;
  }

  public findChild(link: string): Entry<any> | null {
    return this.subEntries.find((entry) => entry.base.link === link) ?? null;
  }

  public abstract fetch(): Promise<ContentType>;
}

export interface LoaderContext<U extends Content<any, any, any>> {
  load(type: U['type'], path: string): Promise<Entry<U>>;
}

export interface EntryLoader<ContentType extends Content<any, any, any>> {
  readonly type: ContentType['type'];
  load<U extends Content<any, any, any>>(context: LoaderContext<U>, path: string): Promise<Entry<ContentType>>;
}

export type Loaders<U extends Content<any, any, any>> = {
  [K in U as K['type']]: EntryLoader<K>;
};

export type Entries<U extends Content<any, any, any>> = {
  [K in U as K['type']]: Entry<K>;
};

export class Cms<U extends Content<any, any, any>> implements LoaderContext<U> {
  private loaders: Loaders<U>;
  private rootType: U['type'];
  private _rootEntry: Entry<any> | null = null;

  public constructor(loaders: Loaders<U>, rootType: U['type']) {
    this.rootType = rootType;
    this.loaders = loaders;
  }

  public get rootEntry(): Entry<any> | null {
    return this._rootEntry;
  }

  public async loadRoot(rootFolder: string): Promise<void> {
    const loader = this.loaders[this.rootType];
    this._rootEntry = await loader.load(this, rootFolder);
  }

  public async load(type: U['type'], path: string): Promise<Entry<U>> {
    const loader = this.loaders[type];
    return loader.load(this, path);
  }
};

export class CmsBuilder<U extends Content<any, any, any>> {
  private loaders: Loaders<U>;

  private constructor(loaders: Loaders<U>) {
    this.loaders = loaders;
  }

  public static use<
    ContentType extends Content<any, any, any>
  >(loader: EntryLoader<ContentType>) {
    return new CmsBuilder<ContentType>({
      [loader.type]: loader,
    } as Loaders<ContentType>);
  }

  public use<
    ContentType extends Content<any, any, any>
  >(loader: EntryLoader<ContentType>) {
    return new CmsBuilder<U | ContentType>({
      ...this.loaders,
      [loader.type]: loader,
    });
  }

  public root(rootType: U['type']): Cms<U> {
    return new Cms<U>(this.loaders, rootType);
  }
}
