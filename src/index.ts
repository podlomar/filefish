import mime from 'mime-types';
import { promises as fs } from 'fs';
import { ContentType } from "./content-type.js";
import { Agent, Cursor, agnosticAgent } from "./cursor.js";
import { FilefishIndexer, IndexEntry, Indexer, LogMessage, ParentEntry } from "./indexer.js";
import { Result } from "monadix/result";
import { FilefishLoader, LoadError, Loader } from "./loader.js";

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
  createIndexer: (contentId: string, contentPath: string[]) => Indexer;
  createLoader: (assetsBasePath: string) => Loader;
}

export class Filefish<E extends IndexEntry> {
  private rootEntry: E;
  private options: FilefishOptions;
  private loader: FilefishLoader;

  private constructor(rootEntry: E, options: FilefishOptions) {
    this.rootEntry = rootEntry;
    this.options = options;
    this.loader = this.options.createLoader(this.options.assetsBasePath);
  }

  public static async create<RootSource, RootEntry extends IndexEntry>(
    rootSource: RootSource,
    rootContentType: ContentType<RootSource, RootEntry, unknown>,
    options: Partial<FilefishOptions> = {},
  ): Promise<Filefish<RootEntry> | null> {
    const fullOptions: FilefishOptions = {
      assetsBasePath: options.assetsBasePath ?? '/assets',
      createIndexer: options.createIndexer ?? (
        (contentId: string, parentContentPath: string[]) => new FilefishIndexer(
          contentId, parentContentPath
        )
      ),
      createLoader: options.createLoader ?? (
        (assetsBasePath: string) => new FilefishLoader(assetsBasePath)
      ),
    };
    
    const indexer = fullOptions.createIndexer(rootContentType.contentId, ['']);
    const rootEntry = await rootContentType.index(rootSource, indexer);  
    return new Filefish(rootEntry, fullOptions);
  }

  public root(): E {
    return this.rootEntry;
  }

  public rootCursor(agent: Agent): Cursor<E> {
    return new Cursor([], {
      entry: this.rootEntry,
      pos: 0,
    }, agent);
  }

  public summary(cursor: Cursor = this.rootCursor(agnosticAgent)): IndexSummary {
    const entry = cursor.entry();
    return summarizeEntry(entry);
  }

  public async loadContent<Content>(
    cursor: Cursor,
    contentType: ContentType<any, any, Content>
  ): Promise<Result<Content, LoadError>> {
    if (!contentType.fitsCursor(cursor)) {
      return Result.fail('wrong-content-type');
    }

    return contentType.loadContent(cursor, this.loader);
  }

  public async reindex(
    cursor: Cursor, contentType: ContentType<any, any, unknown>,
  ): Promise<'ok' | 'not-found' | 'wrong-content-type'> {
    if (!contentType.fitsCursor(cursor)) {
      return 'wrong-content-type';
    }

    const indexer = this.options.createIndexer(
      contentType.contentId,
      cursor.contentPath().split('/').slice(0, -1)
    );
  
    const entry = cursor.entry();
    const newEntry = await indexer.indexChild(entry.name, entry.source, contentType);
    const parent = cursor.parent();

    if (parent === null) {
      this.rootEntry = newEntry as E;
      return 'ok';
    }

    parent.entry().subEntries[cursor.pos()] = newEntry;
    return 'ok';
  }

  public async loadAsset(cursor: Cursor, assetName: string): Promise<Asset | 'not-found'> {
    const entry = cursor.entry();
    if (entry.assets === undefined) {
      return 'not-found';
    }

    if (!entry.assets.names.includes(assetName)) {
      return 'not-found';
    }

    const assetPath = `${entry.assets.folder}/${assetName}`;

    return {
      data: await fs.readFile(assetPath),
      contentType: mime.lookup(assetPath) || 'application/octet-stream',
    }
  }
};
