import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";
import {
  ContentType,
  IndexingContext,
  LoadingContext,
} from "./content-types.js";
import { OkCursor, Cursor } from "./cursor.js";
import { fsNode, FsNode } from "fs-inquire";
import { IndexEntry, InnerEntry, LogMessage, ParentEntry } from "./treeindex.js";
import { Result } from "monadix/result";
import { LoadError } from "./errors.js";

export interface IndexSummary {
  readonly entryCount: number;
  readonly contentTypes: { [key: string]: number };
  readonly log: LogMessage[];
}

const summarizeEntry = (entry: IndexEntry): IndexSummary => {
  if (entry.type === 'leaf') {
    return {
      entryCount: 1,
      contentTypes: {
        [entry.contentId]: 1,
      },
      log: entry.log ?? [],
    }
  }

  const subEntriesSummary = entry.subEntries.reduce(
    (acc: IndexSummary, subEntry: IndexEntry): IndexSummary => {
      const subSummary = summarizeEntry(subEntry);
      const contentTypes = { ...acc.contentTypes };

      for (const [key, value] of Object.entries(subSummary.contentTypes)) {
        contentTypes[key] = (contentTypes[key] ?? 0) + value;
      }

      return {
        entryCount: acc.entryCount + subSummary.entryCount,
        contentTypes,
        log: [...acc.log, ...subSummary.log],
      }
      }, {
        entryCount: 0,
        contentTypes: {},
        log: [],
      } as IndexSummary
    );

  return {
    entryCount: subEntriesSummary.entryCount + 1,
    contentTypes: {
      ...subEntriesSummary.contentTypes,
      [entry.contentId]: (subEntriesSummary.contentTypes[entry.contentId] ?? 0) + 1,
    },
    log: [...subEntriesSummary.log, ...entry.log ?? []],
  };
}

export interface Asset {
  readonly data: Buffer;
  readonly contentType: string;
}

export interface FilefishOptions {
  readonly assetsBasePath: string;
  createIndexingContext?: (contentId: string) => IndexingContext;
}

export class Filefish<E extends IndexEntry> {
  private rootEntry: E;
  private options: FilefishOptions;
  private loadingContext: LoadingContext;

  public constructor(rootEntry: E, options: Partial<FilefishOptions> = {}) {
    this.rootEntry = rootEntry;
    this.options = {
      assetsBasePath: options.assetsBasePath ?? '',
      createIndexingContext: options.createIndexingContext,
    };
    this.loadingContext = {
      assetBasePath: this.options.assetsBasePath,
    };
  }

  public root(): E {
    return this.rootEntry;
  }

  public rootCursor() {
    return new OkCursor([
      {
        entry: this.rootEntry,
        pos: 0,
      }
    ]);
  }

  public summary(cursor: OkCursor<IndexEntry> = this.rootCursor()): IndexSummary {
    const entry = cursor.entry();
    return summarizeEntry(entry);
  }

  public async loadContent<Content>(
    cursor: Cursor,
    contentType: ContentType<any, any, Content, any>
  ): Promise<Result<Content, LoadError>> {
    return cursor.load(contentType, this.loadingContext);
  }

  public async loadShallowContent<ShallowContent>(
    cursor: Cursor,
    contentType: ContentType<any, any, any, ShallowContent>
  ): Promise<Result<ShallowContent, LoadError>> {
    return cursor.loadShallow(contentType, this.loadingContext);
  }

  public async reindex(
    cursor: Cursor, contentType: ContentType
  ): Promise<'ok' | 'not-found' | 'mismatch'> {
    if (!cursor.isOk()) {
      return 'not-found';
    }
    
    if (!contentType.fits(cursor)) {
      return 'mismatch';
    }

    const indexingContext = this.options.createIndexingContext?.(contentType.contentId)
      ?? new IndexingContext(contentType.contentId, cursor.contentPath().split('/').slice(0, -1));
    const entry = cursor.entry();
    const newEntry = await contentType.indexOne(entry.fsNode, indexingContext);
    const parentEntry = cursor.parent().entry() as ParentEntry;
    parentEntry.subEntries[cursor.pos()] = newEntry;

    return 'ok';
  }

  public async loadAsset(cursor: Cursor, assetName: string): Promise<Asset | 'not-found'> {
    if (!cursor.isOk()) {
      return 'not-found';
    }

    const entry = cursor.entry();
    const asset = entry.assets?.find((asset) => asset === assetName);
    if (asset === undefined) {
      return 'not-found';
    }

    const assetPath = entry.fsNode.type === 'file'
      ? path.resolve(entry.fsNode.path, '../assets', asset)
      : path.resolve(entry.fsNode.path, 'assets', asset);

    return {
      data: await fs.readFile(assetPath),
      contentType: mime.lookup(assetPath) || 'application/octet-stream',
    }
  }
}

export const filefish = async <E extends IndexEntry>(
  root: string,
  rootContentType: ContentType<FsNode, E, unknown>,
  options: Partial<FilefishOptions> = {},
): Promise<Filefish<E> | null> => {
  const rootResult = fsNode(root).get();
  if (rootResult.isFail()) {
    return null;
  }

  const indexingContext = options.createIndexingContext?.(rootContentType.contentId)
    ?? new IndexingContext(rootContentType.contentId, []);
  const rootNode = rootResult.getOrThrow();
  const rootEntry = await rootContentType.indexOne(rootNode, indexingContext);
  return new Filefish(rootEntry, options);
};
