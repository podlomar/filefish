import { OkCursor } from "./cursor.js";
import { FsNode } from "fs-inquire";
import { 
  IndexEntry,
  BaseEntry,
  LeafEntry,
  buildBaseEntry,
  buildLeafEntry,
  buildInnerEntry,
  InnerEntry,
} from "./treeindex.js";
import { Result } from "monadix/result";
import { LoadError } from "./errors.js";

export interface LoadingContext {
  readonly assetBasePath: string;
}

export interface ContentType<
  NodeType extends FsNode = FsNode,
  Entry extends IndexEntry = IndexEntry,
  Content extends ShallowContent = any,
  ShallowContent = Content,
> {
  readonly contentId: string;
  indexOne(node: NodeType, context: IndexingContext): Promise<Entry>;
  indexMany(nodes: NodeType[], context: IndexingContext): Promise<Entry[]>;
  loadOne(
    cursor: OkCursor<Entry>, context: LoadingContext,
  ): Promise<Result<Content, LoadError>>;
  loadMany(
    cursors: OkCursor<Entry>[], context: LoadingContext
  ): Promise<Result<Content, LoadError>[]>;
  loadShallowOne(
    cursor: OkCursor<Entry>, context: LoadingContext,
  ): Promise<Result<ShallowContent, LoadError>>;
  loadShallowMany(
    cursors: OkCursor<Entry>[], context: LoadingContext
  ): Promise<Result<ShallowContent, LoadError>[]>;
  fits(cursor: OkCursor<IndexEntry>): cursor is OkCursor<Entry>;
  buildAssetPath(
    cursor: OkCursor<Entry>, assetName: string, context: LoadingContext,
  ): string;
}

export class IndexingContext {
  public readonly contentId: string;
  public readonly parentContentPath: readonly string[];
  
  public constructor(contentId: string, parentContentPath: readonly string[]) {
    this.contentId = contentId;
    this.parentContentPath = parentContentPath;
  }

  public child(contentId: string, name: string): IndexingContext {
    return new IndexingContext(contentId, [...this.parentContentPath, name]);
  }

  public buildBaseEntry<Data extends {}>(
    fsNode: FsNode, data: Data
  ): BaseEntry<Data> {
    return buildBaseEntry(this.contentId, fsNode, data);
  }

  public buildLeafEntry<Data extends {}>(
    fsNode: FsNode, data: Data,
  ): LeafEntry<Data> {
    return buildLeafEntry(this.contentId, fsNode, data);
  }

  public buildInnerEntry<Entry extends IndexEntry, Data extends {}>(
    fsNode: FsNode, data: Data, subEntries: Entry[],
  ): InnerEntry<Entry, Data> {
    return buildInnerEntry(this.contentId, fsNode, data, subEntries);
  }

  public indexSubEntries<
    NodeType extends FsNode, Entry extends IndexEntry,
  >(
    nodes: NodeType[], name: string, contentType: ContentType<NodeType, Entry, unknown>,
  ): Promise<Entry[]> {
    return contentType.indexMany(nodes, this.child(contentType.contentId, name));
  }
}

export interface ContentTypeDefinition<
  NodeType extends FsNode,
  Entry extends IndexEntry,
  Content extends ShallowContent,
  ShallowContent = Content,
> {
  indexOne: (node: NodeType, context: IndexingContext) => Promise<Entry>;
  loadOne: (cursor: OkCursor<Entry>, context: LoadingContext) => Promise<Result<Content, LoadError>>;
  loadShallowOne?: (cursor: OkCursor<Entry>, context: LoadingContext) => Promise<Result<ShallowContent, LoadError>>; 
}

export const contentType = <
  NodeType extends FsNode,
  Entry extends IndexEntry,
  Content extends ShallowContent,
  ShallowContent = Content,
>(
  contentId: string,
  definition: ContentTypeDefinition<NodeType, Entry, Content, ShallowContent>,
): ContentType<NodeType, Entry, Content, ShallowContent> => ({
  contentId,
  indexOne: definition.indexOne,
  async indexMany(
    nodes: NodeType[], context: IndexingContext,
  ): Promise<Entry[]> {
    return Promise.all(nodes.map(node => this.indexOne(node, context)));
  },
  loadOne: definition.loadOne,
  loadShallowOne: definition.loadShallowOne ?? definition.loadOne,
  async loadMany(
    cursors: OkCursor<Entry>[], context: LoadingContext
  ): Promise<Result<Content, LoadError>[]> {
    return Promise.all(cursors.map(cursor => this.loadOne(cursor, context)));
  },
  async loadShallowMany(
    cursors: OkCursor<Entry>[], context: LoadingContext
  ): Promise<Result<ShallowContent, LoadError>[]> {
    return Promise.all(cursors.map(cursor => this.loadShallowOne(cursor, context)));
  },
  fits(cursor: OkCursor<IndexEntry>): cursor is OkCursor<Entry> {
    return cursor.entry().contentId === contentId;
  },
  buildAssetPath(
    cursor: OkCursor<Entry>, assetName: string, context: LoadingContext,
  ): string {
    return `${context.assetBasePath}${cursor.contentPath()}/${assetName}`;
  },
});
