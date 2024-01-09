import type { ContentType } from "./content-type.js";

export type AttributeValue = string | number | boolean | null | Attributes | AttributesArray;

export type Attributes<T extends string = any> = {
  readonly [key in T]: AttributeValue;
}

export type AttributesArray = readonly AttributeValue[];

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

export interface BaseEntry<Source, Attrs extends Attributes> {
  readonly contentId: string;
  readonly source: Source;
  readonly access: EntryAccess;
  readonly name: string;
  readonly title: string;
  readonly assets?: EntryAssets;
  readonly log?: LogMessage[];
  readonly attrs: Attrs;
}

export interface ParentEntry<
  Source = any,
  E extends IndexEntry = IndexEntry,
  Attrs extends Attributes = Attributes,
> extends BaseEntry<Source, Attrs> {
  readonly type: 'parent';
  readonly subEntries: E[],
}

export interface LeafEntry<
  Source = any, Attrs extends Attributes = Attributes,
> extends BaseEntry<Source, Attrs> {
  readonly type: 'leaf';
}

export type IndexEntry<
  Source = any, Attrs extends Attributes = Attributes,
> = ParentEntry<Source, IndexEntry, Attrs> | LeafEntry<Source, Attrs>;

export const buildBaseEntry = <Source, Attrs extends Attributes>(
  contentId: string,
  name: string,
  source: Source,
  access: EntryAccess,
  attrs: Attrs,
): BaseEntry<Source, Attrs> => ({
  contentId,
  source,
  access,
  name: name,
  title: name,
  attrs,
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
  buildLeafEntry<Source, Attrs extends Attributes>(
    name: string, source: Source, access: EntryAccess, attrs: Attrs
  ): LeafEntry<Source, Attrs>;
  buildParentEntry<Source, Entry extends IndexEntry, Attrs extends Attributes>(
    name: string, source: Source, access: EntryAccess, attrs: Attrs, subEntries: Entry[],
  ): ParentEntry<Source, Entry, Attrs>;
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

  public buildLeafEntry<Source, Attrs extends Attributes>(
    name: string, source: Source, access: EntryAccess, attrs: Attrs,
  ): LeafEntry<Source, Attrs> {
    return {
      ...buildBaseEntry(this.contentId, name, source, access, attrs),
      type: 'leaf',
    }
  }

  public buildParentEntry<
    Source, Entry extends IndexEntry, Attrs extends Attributes
  >(
    name: string, source: Source, access: EntryAccess, attrs: Attrs, subEntries: Entry[],
  ): ParentEntry<Source, Entry, Attrs> {
    return {
      ...buildBaseEntry(this.contentId, name, source, access, attrs),
      type: 'parent',
      subEntries,
    }
  }
}
