import { promises as fs } from 'fs';
import { EntryBase, LeafEntry, ParentEntry, RefableEntry } from "../entry.js";
import { PlainTextFile, PlainFolder, FolderItem } from './content.js';

export class PlainTextEntry extends LeafEntry<PlainTextFile> implements RefableEntry<FolderItem> {
  public constructor(base: EntryBase) {
    super(base);
  }

  public getContentRef(): FolderItem {
    return {
      type: 'file',
      link: this.link,
    }
  }

  public async fetch(): Promise<PlainTextFile> {
    const content = await fs.readFile(this.base.fsNode.fsPath, 'utf-8');
    return { content };
  }
};

export class PlainFolderEntry
  extends ParentEntry<PlainFolder, PlainFolderEntry | PlainTextEntry>
  implements RefableEntry<FolderItem> {

  public constructor(base: EntryBase) {
    super(base);
  }

  public getContentRef(): FolderItem {
    return {
      type: 'folder',
      link: this.link,
    }
  }

  public async fetch(): Promise<PlainFolder> {
    return {
      link: this.link,
      items: this.subEntries.map((subEntry) => subEntry.getContentRef()),
    };
  }
}