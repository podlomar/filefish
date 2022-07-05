import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Extra, FileNode, FolderNode, FSysNode } from './fsysnodes.js';
import { Entry, EntryBase } from "./entry";

export interface EntryLoader<E extends Entry<any>> {
  load(fsNode: FSysNode): Promise<E>;
}

export interface EntryDefinition {
  title?: string;
  extra?: Extra;
}

export interface SubentryDefinition extends EntryDefinition {
  link: string,
}

export type Subentries = {
  files: {
    extension: string,
  },
  folders: boolean,
  include: SubentryDefinition[],
}

export interface EntryIndex extends EntryDefinition {
  subentries: Subentries,
}

export abstract class TextFileLoader<E extends Entry<any>> implements EntryLoader<E> {  
  protected abstract loadEntry(base: EntryBase, extra?: Extra): Promise<E>;

  public async load(node: FileNode): Promise<E> {
    return this.loadEntry({ fsNode: node, title: node.title }, node.extra);
  }
}

const listSubentryFiles = async (
  folderPath: string, subentries: Subentries
): Promise<FSysNode[]> => Promise.all(
  subentries.include.map(async (def): Promise<FSysNode> => {
    const common = {
      name: def.link,
      title: def.title ?? def.link,
      extra: def.extra,
    };
    
    if (subentries.folders) {
      const fsPath = path.join(folderPath, `${def.link}`);
      try {
        const stat = await fs.stat(fsPath);
        if (stat.isDirectory()) {
          return {
            type: 'folder',
            fsPath,
            ...common,
          }
        }
      } catch(e) {}
    }

    const extension = subentries.files.extension;
    return {
      type: 'file',
      fsPath: path.join(folderPath, `${def.link}.${extension}`),
      extension,
      ...common,
    };
  }));

const listAllFiles = async (folderPath: string): Promise<FSysNode[]> => {
  const fileList = await fs.readdir(folderPath, { withFileTypes: true });
  return Promise.all(fileList.map((file): FSysNode => {
    const fsPath = path.join(folderPath, file.name);

    if (file.isDirectory()) {
      return {
        type: 'folder',
        fsPath,
        name: file.name,
        title: file.name,
      };
    }
      
    const parsed = path.parse(file.name);
    return {
      type: 'file',
      fsPath,
      name: parsed.name,
      title: parsed.name,
      extension: parsed.ext,
    };
  }));
};

export abstract class FolderLoader<E extends Entry<any>> implements EntryLoader<E> {
  protected abstract loadEntry(base: EntryBase, subNodes: FSysNode[], extra?: Extra): Promise<E>;

  public async load(node: FolderNode): Promise<E> {
    const entryIndexPath = path.join(node.fsPath, '_entry.yml');
    const entryIndex: EntryIndex | null = existsSync(entryIndexPath) 
      ? yaml.parse(await fs.readFile(entryIndexPath, 'utf-8'))
      : null;
    
    const subNodes = entryIndex === null
      ? await listAllFiles(node.fsPath)
      : await listSubentryFiles(node.fsPath, entryIndex.subentries);

    const extra = node.extra === undefined 
      ? entryIndex?.extra === undefined 
        ? undefined
        : entryIndex.extra
      : {...node.extra, ...entryIndex?.extra };

    return this.loadEntry(
      { 
        fsNode: node, 
        title: entryIndex?.title ?? node.title,
      },
      subNodes,
      extra,
    );
  }
}
