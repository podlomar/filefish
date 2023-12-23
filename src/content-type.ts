import { Cursor } from "./cursor.js";
import { FsNode } from "fs-inquire";
import { IndexEntry, Indexer } from "./indexer.js";
import { Result } from "monadix/result";
import { LoadError, Loader } from "./loader.js";

export interface ContentType<
  Node extends FsNode,
  Entry extends IndexEntry,
  Content,
> {
  readonly contentId: string;
  indexNode(node: Node, indexer: Indexer): Promise<Entry>;
  loadContent(cursor: Cursor, loader: Loader): Promise<Result<Content, LoadError>>;
  fitsEntry(entry: IndexEntry): entry is Entry;
  fitsCursor(cursor: Cursor): cursor is Cursor<Entry>;
  buildAssetPath(cursor: Cursor, assetName: string, loader: Loader): string;
}

export interface ContentTypeDefinition<
  Node extends FsNode,
  Entry extends IndexEntry,
  Content,
> {
  indexNode: (node: Node, indexer: Indexer) => Promise<Entry>;
  loadContent: (cursor: Cursor<Entry>, loader: Loader) => Promise<Result<Content, LoadError>>;
};

export const defineContentType = <
  Node extends FsNode,
  Entry extends IndexEntry,
  Content,
>(
  contentId: string,
  definition: ContentTypeDefinition<Node, Entry, Content>,
): ContentType<Node, Entry, Content> => ({
  contentId,
  indexNode: definition.indexNode,
  loadContent(cursor: Cursor, loader: Loader): Promise<Result<Content, LoadError>> {
    if (!this.fitsCursor(cursor)) {
      return Promise.resolve(Result.fail('wrong-content-type'));
    }
    return definition.loadContent(cursor, loader);
  },
  fitsEntry(entry: IndexEntry): entry is Entry {
    return entry.contentId === this.contentId;
  },
  fitsCursor(cursor: Cursor): cursor is Cursor<Entry> {
    return this.fitsEntry(cursor.entry());
  },
  buildAssetPath(cursor: Cursor, assetName: string, loader: Loader): string {
    return `${loader.assetBasePath}${cursor.contentPath()}/${assetName}`;
  },
});
