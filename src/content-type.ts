import { Cursor } from "./cursor.js";
import { IndexEntry, Indexer } from "./indexer.js";
import { Result } from "monadix/result";
import { LoadError, Loader } from "./loader.js";

export interface ContentType<
  Source,
  Entry extends IndexEntry,
  Content,
> {
  readonly contentId: string;
  index(source: Source, indexer: Indexer): Promise<Entry>;
  loadContent(cursor: Cursor<Entry>, loader: Loader): Promise<Result<Content, LoadError>>;
  fitsEntry(entry: IndexEntry): entry is Entry;
  fitsCursor(cursor: Cursor): cursor is Cursor<Entry>;
}

export interface ContentTypeDefinition<
  Source,
  Entry extends IndexEntry,
  Content,
> {
  index: (source: Source, indexer: Indexer) => Promise<Entry>;
  loadContent: (cursor: Cursor<Entry>, loader: Loader) => Promise<Result<Content, LoadError>>;
};

export const defineContentType = <
  Source,
  Entry extends IndexEntry,
  Content,
>(
  contentId: string,
  definition: ContentTypeDefinition<Source, Entry, Content>,
): ContentType<Source, Entry, Content> => ({
  contentId,
  index: definition.index,
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
});
