import { createFolderNode } from './fsysnodes.js';
import { Entry } from './entry.js';
import { EntryLoader } from './loader.js';

export class Cms<Root extends Entry<any>> {
  public readonly rootEntry: Root;

  public constructor(rootEntry: Root) {
    this.rootEntry = rootEntry;
  }

  public static async load<Root extends Entry<any>>(
    loader: EntryLoader<Root>, rootFolder: string, rootPath: string = ''
  ): Promise<Cms<Root>> {
    const node = createFolderNode(rootFolder, rootPath);
    return new Cms(await loader.loadOne(node));
  }
};