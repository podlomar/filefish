import { promises as fs } from 'fs';
import { Content, Entry, EntryLoader, LoaderContext } from "./index.js";

export type Folder = Content<'folder', {}, { files: string[] }>;

export class FolderEntry extends Entry<Folder> {
  public async fetch(): Promise<Folder> {
    return {
      type: 'folder',
      public: {},
      full: {
        files: ['file01.txt'],
      }
    }
  }
}

export class FolderLoader implements EntryLoader<Folder> {
  public readonly type: Folder['type'] = 'folder';

  public async load<U extends Content<any, any, any>>(context: LoaderContext<U>, path: string): Promise<Entry<Folder>> {
    const subEntries: Entry<U>[] = [];
    const fileList = await fs.readdir(path, { withFileTypes: true });
    for (const file of fileList) {
      if (file.isDirectory()) {
        subEntries.push(await context.load('folder', `${path}/${file.name}`));
      }
    }

    const entry = new FolderEntry();
    entry.pushEntries(...subEntries);
    return entry;
  }
}
