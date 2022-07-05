import { promises as fs } from 'fs';
import { EntryBase, LeafEntry, ParentEntry, RefableEntry } from "../entry.js";
import { PlainFolder, FolderItem } from './content.js';

export abstract class TextFileEntry<ContentType>
  extends LeafEntry<ContentType> 
  implements RefableEntry<FolderItem> {
  
  public constructor(base: EntryBase) {
    super(base);
  }

  public getContentRef(): FolderItem {
    return {
      type: 'file',
      link: this.link,
    }
  }

  public async fetch(): Promise<ContentType> {
    const plainText = await fs.readFile(this.base.fsPath, 'utf-8');
    return this.processContent(plainText);
  }

  protected abstract processContent(plainText: string): Promise<ContentType>;
};

export class PlainTextEntry extends TextFileEntry<string> {
  public constructor(base: EntryBase) {
    super(base);
  }

  protected async processContent(plainText: string): Promise<string> {
    return plainText;
  }
};

export class PlainFolderEntry
  extends ParentEntry<PlainFolder, PlainFolderEntry | PlainTextEntry>
  implements RefableEntry<FolderItem> {

  public constructor(base: EntryBase, subEntries?: (PlainFolderEntry | PlainTextEntry)[]) {
    super(base, subEntries ?? []);
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