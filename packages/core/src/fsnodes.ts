import { promises as fs } from 'fs';
import path from 'path';
import { LeafEntry, ParentEntry, RefableEntry, EntryBase } from "./entry.js";
import { EntryLoader } from "./loader.js";

export interface TextFile {
  text: string,
};

export interface FSNodeRef {
  link: string,
  type: 'folder' | 'file';
}

export class FileEntry extends LeafEntry<TextFile> implements RefableEntry<FSNodeRef> {
  private fileContent: string;

  public constructor(base: EntryBase, fileContent: string) {
    super(base);
    this.fileContent = fileContent;
  }

  public getContentRef(): FSNodeRef {
    return {
      type: 'file',
      link: this.base.link,
    }
  }

  public async fetch(): Promise<TextFile> {
    return {
      text: this.fileContent,
    }
  }
}

export class FileLoader implements EntryLoader<FileEntry> {
  public async load(filePath: string): Promise<FileEntry> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = path.parse(filePath);
    const base: EntryBase = {
      link: parsed.name,
      title: parsed.base,
    };

    return new FileEntry(base, fileContent);
  }
}

export interface Folder {
  link: string,
  fsNodes: FSNodeRef[],
};

export class FolderEntry
  extends ParentEntry<Folder, FolderEntry | FileEntry>
  implements RefableEntry<FSNodeRef> {

  public constructor(base: EntryBase) {
    super(base);
  }

  public getContentRef(): FSNodeRef {
    return {
      type: 'folder',
      link: this.base.link,
    }
  }

  public async fetch(): Promise<Folder> {
    return {
      link: this.base.link,
      fsNodes: this.subEntries.map((subEntry) => subEntry.getContentRef()),
    };
  }
}

export class FolderLoader implements EntryLoader<FolderEntry> {
  public async load(filePath: string): Promise<FolderEntry> {
    const fileList = await fs.readdir(filePath, { withFileTypes: true });
    const fileLoader = new FileLoader();

    const subEntries = await Promise.all(fileList.map((file) => {
      if (file.isDirectory()) {
        return this.load(path.join(filePath, file.name));
      }
      return fileLoader.load(path.join(filePath, file.name));
    }));

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
