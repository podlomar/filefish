import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";
import {
  ContentType,
  createIndexingContext,
  createLoadingContext,
  FullContentResult,
  LoadingContext,
  RefableContentType,
  ShallowContentResult
} from "./content-types.js";
import { OkCursor, Cursor } from "./cursor.js";
import { fsNode, FsNode } from "fs-inquire";
import { IndexEntry, InnerEntry, LogMessage } from "./treeindex.js";

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
}

export class Filefish<E extends IndexEntry> {
  private rootEntry: E;
  private loadingContext: LoadingContext;
  private options: FilefishOptions;

  public constructor(rootEntry: E, options: Partial<FilefishOptions> = {}) {
    this.rootEntry = rootEntry;
    this.options = {
      assetsBasePath: options.assetsBasePath ?? '',
    };
    this.loadingContext = createLoadingContext(this.options.assetsBasePath);
  }

  public rootCursor() {
    return new OkCursor([
      {
        entry: this.rootEntry,
        pos: 0,
      }
    ]);
  }

  public summary(cursor: OkCursor = this.rootCursor()): IndexSummary {
    const entry = cursor.entry();
    return summarizeEntry(entry);
  }

  public async loadContent<Content>(
    cursor: Cursor,
    contentType: ContentType<FsNode, IndexEntry, Content>
  ): Promise<FullContentResult<Content> | 'not-found'> {
    if (!cursor.isOk()) {
      return 'not-found';
    }
    
    if (!contentType.fits(cursor.entry())) {
      return 'mismatch';
    }

    return contentType.loadContent(cursor, this.loadingContext);
  }

  public async reindex(
    cursor: Cursor,
    contentType: ContentType<FsNode, IndexEntry, unknown>,
  ): Promise<'ok' | 'not-found' | 'mismatch'> {
    if (!cursor.isOk()) {
      return 'not-found';
    }
    
    if (!contentType.fits(cursor.entry())) {
      return 'mismatch';
    }

    const indexingContext = createIndexingContext();
    const entry = cursor.entry();
    const newEntry = await contentType.index(entry.fsNode, indexingContext);
    const parentEntry = cursor.parent().entry() as InnerEntry;
    
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

  public async loadShallowContent<ShallowContent>(
    cursor: Cursor,
    contentType: RefableContentType<FsNode, IndexEntry, unknown, ShallowContent>
  ): Promise<ShallowContentResult<ShallowContent> | 'not-found'> {
    if (!cursor.isOk()) {
      return 'not-found';
    }
    
    if (!contentType.fits(cursor.entry())) {
      return 'mismatch';
    }

    return contentType.loadShallowContent(cursor, this.loadingContext);
  }
}

export const filefish = async <E extends IndexEntry>(
  root: string,
  rootContentType: ContentType<FsNode, E, unknown>,
  options: Partial<FilefishOptions> = {},
): Promise<Filefish<E> | null> => {
  const indexingContext = createIndexingContext();

  const rootResult = fsNode(root).get();
  if (rootResult.isFail()) {
    return null;
  }

  const rootNode = rootResult.getOrThrow();
  const rootEntry = await rootContentType.index(rootNode, indexingContext);
  return new Filefish(rootEntry, options);
};
