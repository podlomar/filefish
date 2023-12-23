import { Cursor } from "./cursor.js";
import { IndexEntry } from "./indexer.js";
import { Result } from "monadix/result";
import type { ContentType } from "./content-type.js";

export type LoadError = 'not-found' | 'wrong-content-type' | 'forbidden';

export interface Loader {
  readonly assetBasePath: string;
  // loadOne<Entry extends IndexEntry, Content>(
  //   cursor: EntryCursor<Entry>, contentType: ContentType<any, Entry, Content>,
  // ): Promise<Result<Content, LoadError>>;
  // loadMany<Entry extends IndexEntry, Content>(
  //   cursors: EntryCursor<Entry>[], contentType: ContentType<any, Entry, Content>,
  // ): Promise<Result<Content, LoadError>[]>;
}

export class FilefishLoader implements Loader {
  public readonly assetBasePath: string;

  public constructor(assetBasePath: string) {
    this.assetBasePath = assetBasePath;
  }

  // public async loadOne<Content>(
  //   cursor: Cursor<any>, contentType: ContentType<any, any, Content>,
  // ): Promise<Result<Content, LoadError>> {
  //   if (!cursor.hasEntry()) {
  //     return Result.fail('not-found');
  //   }
    
  //   if (!contentType.fits(cursor)) {
  //     return Result.fail('wrong-content-type');
  //   }

  //   return contentType.loadContent(cursor, this);
  // }

  // public async loadMany<Entry extends IndexEntry, Content>(
  //   cursors: EntryCursor<Entry>[], contentType: ContentType<any, Entry, Content>,
  // ): Promise<Result<Content, LoadError>[]> {
  //   return Promise.all(cursors.map(cursor => this.loadOne(cursor, contentType)));
  // }
}
