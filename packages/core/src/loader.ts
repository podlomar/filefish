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

export type SubentryPointer = (
  | EntryDefinition & {
      link: string,
    }
  | string
);

export interface SubentriesSelect {
  files?: boolean | {
    extension?: string,
  },
  folders?: boolean,
};

export interface Subentries {
  select?: SubentriesSelect;
  include?: SubentryPointer[];
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

const loadFSysNode = async (
  folderPath: string, parentPath: string, pointer: SubentryPointer, select?: SubentriesSelect
): Promise<FSysNode | null> => {
  const common = typeof pointer === 'string'
    ? {
        contentPath: `${parentPath}/${pointer}`,
        name: pointer,
        title: pointer,
      }
    : {
        contentPath: `${parentPath}/${pointer.link}`,
        name: pointer.link,
        title: pointer.title ?? pointer.link,
        extra: pointer.extra,
      };
    
  if (select?.folders === true) {
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
    } catch(e) {
      return null;
    }
  }

  if (select?.files === false) {
    return null;
  }

  const extension = select?.files === undefined || select.files === true 
    ? undefined
    : select.files.extension;
    
  const fileName = extension === undefined
    ? common.name
    : `${common.name}.${extension}`;
  const fsPath = path.join(folderPath, fileName);
  if(!existsSync(fsPath)) {
    return null;
  }

  return {
    type: 'file',
    fsPath,
    extension: extension ?? null,
    ...common,
  };
}

const listSubentryFiles = async (
  folderPath: string, parentPath: string, subentries?: Subentries
): Promise<FSysNode[]> => {
  if (subentries === undefined) {
    return [];
  }
  
  if (subentries.include === undefined) {
    return [];
  }
  
  const nodes = await Promise.all(
    subentries.include.map(
      (pointer) => loadFSysNode(folderPath, parentPath, pointer, subentries.select)
    )
  );
  
  return nodes.filter((node): node is FSysNode => node !== null);
};

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
