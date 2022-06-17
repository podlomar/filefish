import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { FileNode, FolderNode, FSysNode } from './fsysnodes.js';
import { Entry, EntryBase } from "./entry";


export interface EntryLoader<E extends Entry<any>> {
  load(fsNode: FSysNode): Promise<E>;
}

export interface SubentryItem {
  link: string,
  extra: unknown,
}

export type Subentries = {
  files: {
    extension: string,
  },
  folders: boolean,
  include: SubentryItem[],
}

export interface EntryIndex {
  title?: string,
  extra?: any,
  subentries: Subentries,
}

export abstract class TextFileLoader<E extends Entry<any>> implements EntryLoader<E> {  
  protected abstract loadEntry(base: EntryBase): Promise<E>;

  public async load(node: FileNode): Promise<E> {
    return this.loadEntry({ fsNode: node, title: node.name });
  }
}

const listSubentryFiles = async (
  folderPath: string, subentries: Subentries
): Promise<FSysNode[]> => Promise.all(
  subentries.include.map(async (item): Promise<FSysNode> => {
    if (subentries.folders) {
      const fsPath = path.join(folderPath, `${item.link}`);
      try {
        const stat = await fs.stat(fsPath);
        if (stat.isDirectory()) {
          return {
            type: 'folder',
            fsPath,
            name: item.link,
          }
        }
      } catch(e) {}
    }

    const extension = subentries.files.extension;
    return {
      type: 'file',
      fsPath: path.join(folderPath, `${item.link}.${extension}`),
      name: item.link,
      extension,
    };
  }));

const listAllFiles = async (folderPath: string): Promise<FSysNode[]> => {
  const fileList = await fs.readdir(folderPath, { withFileTypes: true });
  return Promise.all(fileList.map((file): FSysNode => {
    if (file.isDirectory()) {
      return {
        type: 'folder',
        fsPath: path.join(folderPath, file.name),
        name: file.name,
      }
    }
      
    const parsed = path.parse(file.name);
    return {
      type: 'file',
      fsPath: path.join(folderPath, file.name),
      name: parsed.name,
      extension: parsed.ext,
    }
  }));
};

export abstract class FolderLoader<E extends Entry<any>> implements EntryLoader<E> {
  protected abstract loadEntry(base: EntryBase, subNodes: FSysNode[]): Promise<E>;

  public async load(node: FolderNode): Promise<E> {
    const entryIndexPath = path.join(node.fsPath, '_entry.yml');
    const entryIndex: EntryIndex | null = existsSync(entryIndexPath) 
      ? yaml.parse(await fs.readFile(entryIndexPath, 'utf-8'))
      : null;
    
    const subNodes = entryIndex === null
      ? await listAllFiles(node.fsPath)
      : await listSubentryFiles(node.fsPath, entryIndex.subentries);

    return this.loadEntry(
      { 
        fsNode: node, 
        title: entryIndex?.title ?? node.name,
      },
      subNodes
    );
  }
}
