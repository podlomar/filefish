import { FsNode } from "fs-query";

export interface LogMessage {
  readonly level: 'info' | 'warn' | 'error';
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export interface BaseEntry {
  readonly contentId: string;
  readonly name: string;
  readonly fsNode: FsNode;
  readonly assets?: { [key: string]: string; };
  readonly log?: LogMessage[];
}

export interface InnerEntry<E extends IndexEntry = IndexEntry> extends BaseEntry {
  readonly type: 'inner';
  readonly subEntries: E[],
}

export interface LeafEntry extends BaseEntry {
  readonly type: 'leaf';
}

export type IndexEntry = InnerEntry<IndexEntry> | LeafEntry;
