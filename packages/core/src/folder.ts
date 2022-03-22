import { promises as fs } from 'fs';
import path from 'path';
import { Content } from './content.js';
import { Entry, EntryBase, EntryLoader, LoaderContext } from "./index.js";

export type Folder = Content<'folder', {}, { files: string[] }>;

export class FolderEntry extends Entry<Folder> {
  public constructor(base: EntryBase) {
    super(base, 'folder');
  }

  public async fetch(): Promise<Folder> {
    return {
      type: 'folder',
      public: {},
      full: {
        files: this.subEntries.map((subEntry) => subEntry.base.link),
      }
    }
  }
}

export class FolderLoader implements EntryLoader<Folder> {
  public readonly type: Folder['type'] = 'folder';

  public async load<U extends Content<any, any, any>>(context: LoaderContext<U>, filePath: string): Promise<Entry<Folder>> {
    const subEntries: Entry<U>[] = [];
    const fileList = await fs.readdir(filePath, { withFileTypes: true });
    for (const file of fileList) {
      if (file.isDirectory()) {
        subEntries.push(await context.load('folder', path.join(filePath, file.name)));
      } else {
        subEntries.push(await context.load('txtfile', path.join(filePath, file.name)));
      }
    }

    const link = path.basename(filePath);
    const base: EntryBase = {
      link,
      title: link,
    };

    const entry = new FolderEntry(base);
    entry.pushEntries(...subEntries);
    return entry;
  }
}
