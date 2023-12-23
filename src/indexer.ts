import { FsNode } from "fs-inquire";
import type { ContentType } from "./content-type.js";

export interface LogMessage {
  readonly level: 'info' | 'warn' | 'error';
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export interface BaseEntry<Data extends Record<string, any>> {
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
  Data extends Record<string, any> = Record<string, any>,
> extends BaseEntry<Data> {
  readonly type: 'parent';
  readonly subEntries: E[],
}

export interface LeafEntry<
  Data extends Record<string, any> = Record<string, any>
> extends BaseEntry<Data> {
  readonly type: 'leaf';
}

export type IndexEntry<
  Data extends Record<string, any> = Record<string, any>
> = ParentEntry<IndexEntry, Data> | LeafEntry<Data>;

export const buildBaseEntry = <Data extends {}>(
  contentId: string, fsNode: FsNode, data: Data
): BaseEntry<Data> => ({
  contentId,
  name: fsNode.fileName,
  title: fsNode.fileName,
  fsNode,
  data,
});

export interface Indexer {
  readonly contentPath: readonly string[];
  createChild(contentId: string, name: string): Indexer;
  indexNode<Node extends FsNode, Entry extends IndexEntry>(
    node: Node, contentType: ContentType<Node, Entry, any>,
  ): Promise<Entry>;
  indexChildren<Node extends FsNode, Entry extends IndexEntry>(
    nodes: Node[], contentType: ContentType<Node, Entry, any>,
  ): Promise<Entry[]>;
  buildLeafEntry<Data extends {}>(fsNode: FsNode, data: Data,
  ): LeafEntry<Data>;
  buildParentEntry<Entry extends IndexEntry, Data extends {}>(
    fsNode: FsNode, data: Data, subEntries: Entry[],
  ): ParentEntry<Entry, Data>;
}

export class FilefishIndexer implements Indexer {
  public readonly contentPath: readonly string[];
  public readonly contentId: string;

  public constructor(contentId: string, contentPath: readonly string[]) {
    this.contentId = contentId;
    this.contentPath = contentPath;
  }

  public createChild(contentId: string, name: string): Indexer {
    return new FilefishIndexer(contentId, [...this.contentPath, name]);
  }

  public async indexNode<Node extends FsNode, Entry extends IndexEntry>(
    node: Node, contentType: ContentType<Node, Entry, any>,
  ): Promise<Entry> {
    return contentType.indexNode(node, this.createChild(contentType.contentId, node.fileName));
  }

  public async indexChildren<Node extends FsNode, Entry extends IndexEntry>(
    nodes: Node[], contentType: ContentType<Node, Entry, any>,
  ): Promise<Entry[]> {
    return Promise.all(
      nodes.map(
        (node) => contentType.indexNode(node, this.createChild(contentType.contentId, node.fileName))
      )
    );
  }

  public buildLeafEntry<Data extends {}>(
    fsNode: FsNode, data: Data,
  ): LeafEntry<Data> {
    return {
      ...buildBaseEntry(this.contentId, fsNode, data),
      type: 'leaf',
    }
  }

  public buildParentEntry<Entry extends IndexEntry, Data extends {}>(
    fsNode: FsNode, data: Data, subEntries: Entry[],
  ): ParentEntry<Entry, Data> {
    return {
      ...buildBaseEntry(this.contentId, fsNode, data),
      type: 'parent',
      subEntries,
    }
  }
}
