import { createFolderNode } from './fsysnodes.js';
import { EntryClass, Entry } from './entry.js';
import { EntryLoader } from './loader.js';

export interface CmsSummary {
  totalEntries: number;
}

export class Cms<Root extends Entry<any>> {
  public readonly rootEntry: Root;
  public readonly rootPath: string;

  public constructor(rootEntry: Root, rootPath: string) {
    this.rootEntry = rootEntry;
    this.rootPath = rootPath;
  }

  public static async load<Root extends Entry<any>>(
    loader: EntryLoader<Root>, rootFolder: string, rootPath: string = ''
  ): Promise<Cms<Root>> {
    const node = createFolderNode(rootFolder, rootPath);
    return new Cms(await loader.loadOne(node), rootPath);
  }

  public find<T extends Entry<any>>(entryPath: string, type: EntryClass<T>): T | null {
    if (!entryPath.startsWith(this.rootPath)) {
      return null;
    }
    return this.rootEntry.find(entryPath.slice(this.rootPath.length), type);
  }

  public computeSummary(): CmsSummary {
    return {
      totalEntries: this.rootEntry.computeTotalEntries() + 1,
    };
  }
};