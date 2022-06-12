import { FileNode, FSysNode, FolderNode } from '../fsysnodes.js';
import { FolderLoader, TextFileLoader } from '../loader.js';
import { PlainFolderEntry, PlainTextEntry } from './entries.js';

export class PlainTextFileLoader extends TextFileLoader<PlainTextEntry> {  
  protected async loadEntry(node: FileNode): Promise<PlainTextEntry> {
    return new PlainTextEntry(node);
  }
}

export abstract class PlainFolderLoader extends FolderLoader<PlainFolderEntry> {
  protected async loadEntry(node: FolderNode, subNodes: FSysNode[]): Promise<PlainFolderEntry> {
    const plainTextFileLoader = new PlainTextFileLoader();
    const subEntries = await Promise.all(
      subNodes.map((subNode) => subNode.type === 'file'
        ? plainTextFileLoader.load(subNode)
        : this.load(subNode)
      )
    );

    const entry = new PlainFolderEntry(node);
    entry.pushEntries(...subEntries);

    return entry;
  };
}
