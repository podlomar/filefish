import { FsNode } from "fs-inquire";

export interface LogMessage {
  readonly level: 'info' | 'warn' | 'error';
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export interface BaseEntry<Data extends {} = {}> {
  readonly contentId: string;
  readonly name: string;
  readonly title: string;
  readonly fsNode: FsNode;
  readonly assets?: string[];
  readonly log?: LogMessage[];
  readonly data: Data;
}

export interface ParentEntry<
  E extends IndexEntry = IndexEntry,
  Data extends {} = {},
> extends BaseEntry<Data> {
  readonly subEntries: E[],
}

export interface InnerEntry<
  E extends IndexEntry = IndexEntry,
  Data extends {} = {},
> extends ParentEntry<E, Data> {
  readonly type: 'inner';
}

export interface LeafEntry<Data extends {} = {}> extends BaseEntry<Data> {
  readonly type: 'leaf';
}

export type IndexEntry<Data extends {} = {}> = InnerEntry<IndexEntry, Data> | LeafEntry<Data>;

export const buildBaseEntry = <Data extends {}>(
  contentId: string, fsNode: FsNode, data: Data
): BaseEntry<Data> => ({
  contentId,
  name: fsNode.fileName,
  title: fsNode.fileName,
  fsNode,
  data,
});

export const buildLeafEntry = <Data extends {}>(
  contentId: string, fsNode: FsNode, data: Data
): LeafEntry<Data> => ({
  ...buildBaseEntry(contentId, fsNode, data),
  type: 'leaf',
});

export const buildInnerEntry = <Entry extends IndexEntry, Data extends {}>(
  contentId: string, fsNode: FsNode, data: Data, subEntries: Entry[]
): InnerEntry<Entry, Data> => ({
  ...buildBaseEntry(contentId, fsNode, data),
  type: 'inner',
  subEntries,
});

