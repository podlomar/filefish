import { Cms, Entry, Entries } from './index.js';
import { Content } from './content.js';

export class Query<U extends Content<any, any, any>> {
  private cms: Cms<U>;

  private constructor(cms: Cms<U>) {
    this.cms = cms;
  }

  public static of<U extends Content<any, any, any>>(cms: Cms<U>): Query<U> {
    return new Query(cms);
  }

  public find<T extends U['type']>(entryPath: string, type?: T): Entries<U>[T] | null {
    const rootEntry = this.cms.rootEntry;
    if (rootEntry === null) {
      return null;
    }

    const entry = rootEntry.find(entryPath);
    if (type === undefined) {
      return entry;
    }

    if (entry === null) {
      return null;
    }
    return entry.contentType === type ? entry : null;
  }
}