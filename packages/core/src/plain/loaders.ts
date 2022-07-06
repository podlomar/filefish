import { EntryBase } from '../entry.js';
import { FSysNode } from '../fsysnodes.js';
import { FolderLoader, TextFileLoader } from '../loader.js';
import { PlainFolderEntry, PlainTextEntry } from './entries.js';

export class PlainTextFileLoader extends TextFileLoader<PlainTextEntry> {  
  protected async loadEntry(base: EntryBase): Promise<PlainTextEntry> {
    return new PlainTextEntry(base);
  }
}

export abstract class PlainFolderLoader extends FolderLoader<PlainFolderEntry> {
  protected async loadEntry(base: EntryBase, subNodes: FSysNode[]): Promise<PlainFolderEntry> {
    const plainTextFileLoader = new PlainTextFileLoader();
    const subEntries = await Promise.all(
      subNodes.map((subNode) => subNode.type === 'file'
        ? plainTextFileLoader.loadOne(subNode)
        : this.loadOne(subNode)
      )
    );

    return new PlainFolderEntry(base, subEntries);
  };
}
