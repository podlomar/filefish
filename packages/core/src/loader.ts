import { promises as fs, existsSync } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Extra, FailedNode, FileNode, FolderNode, FSysNode, MaybeNode } from './fsysnodes.js';
import { createEntryBase, Entry, EntryBase } from "./entry.js";
import { problem } from './problems.js';

export abstract class EntryLoader<E extends Entry<any>> {
  public constructor() {}

  protected abstract loadEntry(base: EntryBase, extra?: Extra): Promise<E>;

  public loadOne(fsNode: FSysNode): Promise<E> {
    return this.loadEntry(createEntryBase(fsNode, null, []), fsNode.extra);
  }
  
  public async loadMany(fsNodes: FSysNode[], problems: string[]): Promise<E[]> {
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

const resolveFSysNode = async (
  folderPath: string, parentPath: string, pointer: SubentryPointer, select?: SubentriesSelect
): Promise<MaybeNode> => {
  const common = typeof pointer === 'string'
    ? {
        contentPath: `${parentPath}/${pointer}`,
        name: pointer,
        title: null,
      }
    : {
        contentPath: `${parentPath}/${pointer.link}`,
        name: pointer.link,
        title: pointer.title ?? null,
        extra: pointer.extra,
      };
    
  if (select?.folders === true) {
    const fsPath = path.resolve(folderPath, `${common.name}`);
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
      return {
        type: 'failed',
        problems: [(e as Error).message],
      };
    }
  }

  if (select?.files === false) {
    return {
      type: 'failed',
      problems: [problem('no_directory', common.name)],
    };
  }

  const extension = select?.files === undefined || select.files === true 
    ? undefined
    : select.files.extension;
    
  const fileName = extension === undefined
    ? common.name
    : `${common.name}.${extension}`;
  
  const fsPath = path.resolve(folderPath, fileName);
  if(!existsSync(fsPath)) {
    return {
      type: 'failed',
      problems: [problem('no_file', common.name)],
    };
  }

  return {
    type: 'file',
    fsPath,
    extension: extension ?? null,
    ...common,
  };
}

const resolveSubentries = async (
  folderPath: string, parentPath: string, subentries?: Subentries
): Promise<MaybeNode[] | string> => {
  if (subentries === undefined) {
    return problem('no_subentries');
  }
  
  if (subentries.include === undefined) {
    return problem('no_include');
  }
  
  return Promise.all(
    subentries.include.map(
      (pointer) => resolveFSysNode(folderPath, parentPath, pointer, subentries.select)
    )
  );
};

const resolveFiles = async (folderPath: string, parentPath: string): Promise<FSysNode[]> => {
  const fileList = await fs.readdir(folderPath, { withFileTypes: true });
  return Promise.all(fileList.map((file): FSysNode => {
    const fsPath = path.resolve(folderPath, file.name);

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
  protected abstract loadFolder(
    base: EntryBase,
    subNodes: FSysNode[],
    extra?: Extra,
  ): Promise<E>;

  protected async loadEntry(base: EntryBase, extra?: Extra): Promise<E> {
    const entryIndexPath = path.join(base.fsPath, '_entry.yml');
    const entryIndex: EntryIndex | null = existsSync(entryIndexPath) 
      ? yaml.parse(await fs.readFile(entryIndexPath, 'utf-8'))
      : null;
    
    const resolved = entryIndex === null
      ? await resolveFiles(base.fsPath, base.contentPath)
      : await resolveSubentries(base.fsPath, base.contentPath, entryIndex.subentries, );

    const problems = typeof resolved === 'string'
      ? [resolved]
      : resolved
        .filter((node): node is FailedNode => node.type === 'failed')
        .flatMap((node) => node.problems);

    const okNodes = typeof resolved === 'string'
      ? []
      : resolved.filter((node): node is FSysNode => node.type !== 'failed');

    const extendedExtra = extra === undefined
      ? entryIndex?.extra === undefined 
        ? undefined
        : entryIndex.extra
      : {...extra, ...entryIndex?.extra };

    return this.loadFolder(
      {
        ...base,
        problems: [...base.problems, ...problems],
        title: entryIndex?.title ?? base.title,
      },
      okNodes,
      extendedExtra,
    );
  }
}
