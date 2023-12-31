import { FsNode } from "fs-inquire";
import type { ContentType } from "./content-type.js";

export type AttributeValue = string | number | boolean | null | Attributes | AttributesArray;

export interface Attributes {
  readonly [key: string]: AttributeValue;
}

export type AttributesArray = readonly AttributeValue[];

export interface LogMessage {
  readonly level: 'info' | 'warn' | 'error';
  readonly code: string;
  readonly message: string;
  readonly meta?: unknown;
}

export type EntryAccess = 'public' | 'claim';

export interface BaseEntry<Attrs extends Attributes> {
  readonly contentId: string;
  readonly access: EntryAccess;
  readonly name: string;
  readonly title: string;
  readonly fsNode: FsNode;
  readonly assets?: string[];
  readonly log?: LogMessage[];
  readonly attrs: Attrs;
}

export interface ParentEntry<
  E extends IndexEntry = IndexEntry,
  Attrs extends Attributes = Attributes,
> extends BaseEntry<Attrs> {
  readonly type: 'parent';
  readonly subEntries: E[],
}

export interface LeafEntry<
  Attrs extends Attributes = Attributes,
> extends BaseEntry<Attrs> {
  readonly type: 'leaf';
}

export type IndexEntry<
  Attrs extends Attributes = Attributes,
> = ParentEntry<IndexEntry, Attrs> | LeafEntry<Attrs>;

export const buildBaseEntry = <Attrs extends Attributes>(
  contentId: string, fsNode: FsNode, access: EntryAccess, attrs: Attrs
): BaseEntry<Attrs> => ({
  contentId,
  access,
  name: fsNode.fileName,
  title: fsNode.fileName,
  fsNode,
  attrs,
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
  buildLeafEntry<Attrs extends Attributes>(fsNode: FsNode, access: EntryAccess, attrs: Attrs,
  ): LeafEntry<Attrs>;
  buildParentEntry<Entry extends IndexEntry, Attrs extends Attributes>(
    fsNode: FsNode, access: EntryAccess, attrs: Attrs, subEntries: Entry[],
  ): ParentEntry<Entry, Attrs>;
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

  public buildLeafEntry<Attrs extends Attributes>(
    fsNode: FsNode, access: EntryAccess, attrs: Attrs,
  ): LeafEntry<Attrs> {
    return {
      ...buildBaseEntry(this.contentId, fsNode, access, attrs),
      type: 'leaf',
    }
  }

  public buildParentEntry<Entry extends IndexEntry, Attrs extends Attributes>(
    fsNode: FsNode, access: EntryAccess, attrs: Attrs, subEntries: Entry[],
  ): ParentEntry<Entry, Attrs> {
    return {
      ...buildBaseEntry(this.contentId, fsNode, access, attrs),
      type: 'parent',
      subEntries,
    }
  }
}
