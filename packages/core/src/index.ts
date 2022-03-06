export interface Content<
  Type extends string,
  Public extends {},
  Full extends Public
  > {
  type: `${Type}`,
  public: Public,
  full: Full,
};

export abstract class Entry<
  ContentType extends Content<any, any, any>
  > {
  private subEntries: Entry<any>[];

  constructor() {
    this.subEntries = [];
  }

  public pushEntries(...entries: Entry<any>[]) {
    this.subEntries.push(...entries);
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

class TxtFileLoader implements EntryLoader<TxtFile> {
  public readonly type: TxtFile['type'] = 'txt';

  public async load<U extends Content<any, any, any>>(context: LoaderContext<U>): Promise<Entry<TxtFile>> {
    return new TxtFileEntry();
  }
}

export type Loaders<U extends Content<any, any, any>> = {
  [K in U['type']]: EntryLoader<U>;
};

export class Cms<U extends Content<any, any, any>> implements LoaderContext<U> {
  private loaders: Loaders<U>;

  private constructor(loaders: Loaders<U>) {
    this.loaders = loaders;
  }

  public static create(): Cms<never> {
    return new Cms<never>({});
  }

  public use<
    ContentType extends Content<any, any, any>
  >(loader: EntryLoader<ContentType>) {
    return new Cms<U | ContentType>({
      ...this.loaders,
      [loader.type]: loader,
    });
  }

  public async load(type: U['type'], path: string): Promise<Entry<U>> {
    const loader = this.loaders[type];
    return loader.load(this, path);
  }
}