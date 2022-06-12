import { promises as fs } from 'fs';
import { FileNode, FSysNode, FolderNode } from '../fsysnodes.js';
import { LeafEntry, ParentEntry, RefableEntry } from "../entry.js";
import { PlainTextFile, PlainFolder, FolderItem } from './content.js';

export class PlainTextEntry extends LeafEntry<PlainTextFile> implements RefableEntry<FolderItem> {
  public constructor(base: FileNode) {
    super(base);
  }

  public getContentRef(): FolderItem {
    return {
      type: 'file',
      link: this.fsNode.name,
    }
  }

  public async fetch(): Promise<PlainTextFile> {
    const content = await fs.readFile(this.fsNode.fsPath, 'utf-8');
    return { content };
  }
};

export class PlainFolderEntry
  extends ParentEntry<PlainFolder, PlainFolderEntry | PlainTextEntry>
  implements RefableEntry<FolderItem> {

  public constructor(fsNode: FolderNode) {
    super(fsNode);
  }

  public getContentRef(): FolderItem {
    return {
      type: 'folder',
      link: this.fsNode.name,
    }
  }

  public async fetch(): Promise<PlainFolder> {
    return {
      link: this.fsNode.name,
      items: this.subEntries.map((subEntry) => subEntry.getContentRef()),
    };
  }
}