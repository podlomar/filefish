export interface Content<
  Type extends string,
  Public extends {},
  Full extends Public
  > {
  type: `${Type}`,
  public: Public,
  full: Full,
};

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

  public find(entryPath: string, contentType: string): Entry<any> | null {
    const firstSlashIdx = entryPath.indexOf('/');
    const link = firstSlashIdx > -1 ? entryPath.slice(0, firstSlashIdx) : entryPath;
    const subEntry = this.subEntries.find((entry) => entry.base.link === link);

    if (subEntry === undefined) {
      return null;
    }

    if (firstSlashIdx > -1) {
      const subPath = entryPath.slice(firstSlashIdx + 1);
      return subEntry.find(subPath, contentType);
    }

    return subEntry.contentType === contentType ? subEntry : null;
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

type TxtFile = Content<'txt', {}, { content: string }>;
class TxtFileEntry extends Entry<TxtFile> {
  public async fetch(): Promise<TxtFile> {
    return {
      type: 'txt',
      public: {},
      full: {
        content: 'ahoj',
      }
    }
  }
}

// class TxtFileLoader implements EntryLoader<TxtFile> {
//   public readonly type: TxtFile['type'] = 'txt';

//   public async load<U extends Content<any, any, any>>(context: LoaderContext<U>): Promise<Entry<TxtFile>> {
//     return new TxtFileEntry();
//   }
// }

export type Loaders<U extends Content<any, any, any>> = {
  [K in U['type']]: EntryLoader<U>;
};

export class Cms<U extends Content<any, any, any>> implements LoaderContext<U> {
  private loaders: Loaders<U>;
  private rootType: U['type'];
  private rootEntry: Entry<any> | null = null;

  public constructor(loaders: Loaders<U>, rootType: U['type']) {
    this.rootType = rootType;
    this.loaders = loaders;
  }

  public async loadRoot(rootFolder: string): Promise<void> {
    const loader = this.loaders[this.rootType];
    this.rootEntry = await loader.load(this, rootFolder);
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