import type { ContentType } from "./content-type.js";

export interface LogMessage {
  readonly level: 'info' | 'warn' | 'error';
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export type EntryAccess = 'public' | 'protected';

export interface EntryAssets {
  readonly folder: string;
  readonly names: readonly string[];
}

export interface BaseEntry<Source, Data> {
  readonly contentId: string;
  readonly source: Source;
  readonly access: EntryAccess;
  readonly name: string;
  readonly title: string;
  readonly assets?: EntryAssets;
  readonly log?: LogMessage[];
  readonly data: Data;
}

export interface ParentEntry<
  Source = any,
  E extends IndexEntry = IndexEntry,
  Data = {},
> extends BaseEntry<Source, Data> {
  readonly type: 'parent';
  readonly subEntries: E[],
}

export interface LeafEntry<
  Source = any, Data = {},
> extends BaseEntry<Source, Data> {
  readonly type: 'leaf';
}

export type IndexEntry<
  Source = any, Data = {},
> = ParentEntry<Source, IndexEntry, Data> | LeafEntry<Source, Data>;

export const buildBaseEntry = <Source, Data>(
  contentId: string,
  name: string,
  source: Source,
  access: EntryAccess,
  data: Data,
): BaseEntry<Source, Data> => ({
  contentId,
  source,
  access,
  name: name,
  title: name,
  data: data,
});

export interface Indexer {
  readonly parentContentPath: readonly string[];
  createChild(contentId: string, name: string): Indexer;
  indexChild<Source, Entry extends IndexEntry>(
    name: string, source: Source, contentType: ContentType<Source, Entry, any>,
  ): Promise<Entry>;
  indexChildren<Source, Entry extends IndexEntry>(
    name: string, sources: Source[], contentType: ContentType<Source, Entry, any>,
  ): Promise<Entry[]>;
  buildLeafEntry<Source, Data>(
    name: string, source: Source, access: EntryAccess, data: Data
  ): LeafEntry<Source, Data>;
  buildParentEntry<Source, Entry extends IndexEntry, Data>(
    name: string, source: Source, access: EntryAccess, data: Data, subEntries: Entry[],
  ): ParentEntry<Source, Entry, Data>;
}

export class FilefishIndexer implements Indexer {
  public readonly parentContentPath: readonly string[];
  public readonly contentId: string;

  public constructor(
    contentId: string,
    parentContentPath: readonly string[],
  ) {
    this.contentId = contentId;
    this.parentContentPath = parentContentPath;
  }

  public createChild(contentId: string, name: string): Indexer {
    return new FilefishIndexer(contentId, [...this.parentContentPath, name]);
  }

  public async indexChild<Source, Entry extends IndexEntry>(
    name: string, source: Source, contentType: ContentType<Source, Entry, any>,
  ): Promise<Entry> {
    return contentType.index(source, this.createChild(contentType.contentId, name));
  }

  public async indexChildren<Source, Entry extends IndexEntry>(
    name: string, sources: Source[], contentType: ContentType<Source, Entry, any>,
  ): Promise<Entry[]> {
    return Promise.all(
      sources.map(
        (source) => contentType.index(source, this.createChild(contentType.contentId, name))
      )
    );
  }

  public buildLeafEntry<Source, Data>(
    name: string, source: Source, access: EntryAccess, data: Data,
  ): LeafEntry<Source, Data> {
    return {
      ...buildBaseEntry(this.contentId, name, source, access, data),
      type: 'leaf',
    }
  }

  public buildParentEntry<
    Source, Entry extends IndexEntry, Data,
  >(
    name: string, source: Source, access: EntryAccess, data: Data, subEntries: Entry[],
  ): ParentEntry<Source, Entry, Data> {
    return {
      ...buildBaseEntry(this.contentId, name, source, access, data),
      type: 'parent',
      subEntries,
    }
  }
}
