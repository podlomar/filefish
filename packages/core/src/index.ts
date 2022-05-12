import { Entry, Class } from './entry.js';
import { EntryLoader } from './loader.js';

export class Cms<Root extends Entry<any>> {
  public readonly rootEntry: Root;

  public constructor(rootEntry: Root) {
    this.rootEntry = rootEntry;
  }

  public static async load<Root extends Entry<any>>(
    loader: EntryLoader<Root>, rootFolder: string,
  ): Promise<Cms<Root>> {
    return new Cms(await loader.load(rootFolder));
  }
};