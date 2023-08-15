import { OkCursor } from "./cursor.js";
import { FsNode } from "fs-query";
import { IndexEntry } from "./treeindex.js";

export interface ContentType<
  NodeType extends FsNode, Entry extends IndexEntry, Content,
> {
  index(node: NodeType, context: IndexingContext): Promise<Entry>;
  loadContent(cursor: OkCursor, context: LoadingContext): Promise<Content | 'forbidden'>;
  fits(entry: IndexEntry): entry is Entry;
}

export interface RefableContentType<
  NodeType extends FsNode, Entry extends IndexEntry, FullContent, ShallowContent,
> extends ContentType<NodeType, Entry, FullContent> {
  loadShallowContent(cursor: OkCursor, context: LoadingContext): Promise<ShallowContent>;
}

export interface IndexingContext {
  indexOne<NodeType extends FsNode, E extends IndexEntry>(
    node: NodeType, contentType: ContentType<NodeType, E, unknown>
  ): Promise<E>;
  indexMany<NodeType extends FsNode, E extends IndexEntry>(
    nodes: NodeType[], contentType: ContentType<NodeType, E, unknown>
  ): Promise<E[]>;
}

export const createIndexingContext = (): IndexingContext => ({
  async indexOne(node, contentType) {
    return contentType.index(node, this);
  },
  async indexMany(nodes, contentType) {
    return Promise.all(nodes.map(node => this.indexOne(node, contentType)));
  },
});

export type FullContentResult<FullContent> = FullContent | 'forbidden' | 'mismatch';
export type ShallowContentResult<FullContent> = FullContent | 'mismatch';

export interface LoadingContext {
  load<Content>(
    cursor: OkCursor, contentType: ContentType<FsNode, IndexEntry, Content>
  ): Promise<FullContentResult<Content>>;
  loadMany<Content>(
    cursors: OkCursor[], contentType: ContentType<FsNode, IndexEntry, Content>
  ): Promise<FullContentResult<Content>[]>;
  loadShallow<ShallowContent>(
    cursor: OkCursor, contentType: RefableContentType<FsNode, IndexEntry, unknown, ShallowContent>
  ): Promise<ShallowContentResult<ShallowContent>>;
  loadShallowMany<ShallowContent>(
    cursors: OkCursor[], contentType: RefableContentType<FsNode, IndexEntry, unknown, ShallowContent>
  ): Promise<ShallowContentResult<ShallowContent>[]>;
  buildAssetPath(cursor: OkCursor, assetName: string): string;
}

export const createLoadingContext = (assetsBasePath: string): LoadingContext => ({
  async load<Content>(
    cursor: OkCursor, contentType: ContentType<FsNode, IndexEntry, Content>,
  ): Promise<FullContentResult<Content>> {
    if (!contentType.fits(cursor.entry())) {
      return 'mismatch';
    }
    return contentType.loadContent(cursor, this);
  },

  async loadMany<Content>(
    cursors: OkCursor[], contentType: ContentType<FsNode, IndexEntry, Content>
  ): Promise<FullContentResult<Content>[]> {
    return Promise.all(cursors.map(cursor => this.load(cursor, contentType)));
  },

  async loadShallow<ShallowContent>(
    cursor: OkCursor, contentType: RefableContentType<FsNode, IndexEntry, unknown, ShallowContent>
  ): Promise<ShallowContentResult<ShallowContent>> {
    if (!contentType.fits(cursor.entry())) {
      return 'mismatch';
    }
    return contentType.loadShallowContent(cursor, this);
  },

  loadShallowMany<ShallowContent>(
    cursors: OkCursor[], contentType: RefableContentType<FsNode, IndexEntry, unknown, ShallowContent>
  ): Promise<ShallowContentResult<ShallowContent>[]> {
    return Promise.all(cursors.map(cursor => this.loadShallow(cursor, contentType)));
  },

  buildAssetPath(cursor: OkCursor, assetName: string): string {
    return `${assetsBasePath}${cursor.contentPath()}/${assetName}`;
  },
});
