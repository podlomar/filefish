import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Extra, FileNode, FolderNode, FSysNode } from './fsysnodes.js';
import { createEntryBase, Entry, EntryBase } from "./entry.js";

export abstract class EntryLoader<E extends Entry<any>> {
  public constructor() {}

  public abstract loadOne(fsNode: FSysNode): Promise<E>;
  
  public async loadMany(fsNodes: FSysNode[]): Promise<E[]> {
    return Promise.all(fsNodes.map((fsNode) => this.loadOne(fsNode)));
  }
}

export interface EntryDefinition {
  title?: string;
  extra?: Extra;
}

export interface SubentryDefinition extends EntryDefinition {
  link: string,
}

export type SubentryLink = SubentryDefinition | string;

export type Subentries = {
  select: {
    files: {
      extension: string,
    },
    folders: boolean,
  },
  include: SubentryLink[],
}

export interface EntryIndex extends EntryDefinition {
  subentries: Subentries,
}

export abstract class TextFileLoader<E extends Entry<any>> extends EntryLoader<E> {  
  protected abstract loadEntry(base: EntryBase, extra?: Extra): Promise<E>;

  public async loadOne(node: FileNode): Promise<E> {
    return this.loadEntry(createEntryBase(node), node.extra);
  }
}

const listSubentryFiles = async (
  folderPath: string, parentPath: string, subentries: Subentries
): Promise<FSysNode[]> => Promise.all(
  subentries.include.map(async (def): Promise<FSysNode> => {
    const common = typeof def === 'string'
      ? {
          contentPath: `${parentPath}/${def}`,
          name: def,
          title: def,
        }
      : {
          contentPath: `${parentPath}/${def.link}`,
          name: def.link,
          title: def.title ?? def.link,
          extra: def.extra,
        };
    
    if (subentries.select.folders) {
      const fsPath = path.join(folderPath, `${common.name}`);
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

    const extension = subentries.select.files.extension;
    return {
      type: 'file',
      fsPath: path.join(folderPath, `${common.name}.${extension}`),
      extension,
      ...common,
    };
  }));

const listAllFiles = async (folderPath: string, parentPath: string): Promise<FSysNode[]> => {
  const fileList = await fs.readdir(folderPath, { withFileTypes: true });
  return Promise.all(fileList.map((file): FSysNode => {
    const fsPath = path.join(folderPath, file.name);

    if (file.isDirectory()) {
      return {
        type: 'folder',
        contentPath: `${parentPath}/${file.name}`,
        fsPath,
        name: file.name,
        title: file.name,
      };
    }
      
    const parsed = path.parse(file.name);
    return {
      type: 'file',
      contentPath: `${parentPath}/${parsed.name}`,
      fsPath,
      name: parsed.name,
      title: parsed.name,
      extension: parsed.ext,
    };
  }));
};

export abstract class FolderLoader<E extends Entry<any>> extends EntryLoader<E> {
  protected abstract loadEntry(base: EntryBase, subNodes: FSysNode[], extra?: Extra): Promise<E>;

  public async loadOne(node: FolderNode): Promise<E> {
    const entryIndexPath = path.join(node.fsPath, '_entry.yml');
    const entryIndex: EntryIndex | null = existsSync(entryIndexPath) 
      ? yaml.parse(await fs.readFile(entryIndexPath, 'utf-8'))
      : null;
    
    const subNodes = entryIndex === null
      ? await listAllFiles(node.fsPath, node.contentPath)
      : await listSubentryFiles(node.fsPath, node.contentPath, entryIndex.subentries, );

    const extra = node.extra === undefined 
      ? entryIndex?.extra === undefined 
        ? undefined
        : entryIndex.extra
      : {...node.extra, ...entryIndex?.extra };

    return this.loadEntry(
      createEntryBase(node, entryIndex?.title),
      subNodes,
      extra,
    );
  }
}
