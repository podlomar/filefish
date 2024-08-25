import path from 'path';
import fs from 'fs/promises';
import yaml, { ScalarTag } from 'yaml';
import { FileNode, FolderNode, FsNode, readNode } from "./fsys.js";
import { FilefishStore, StoreAsset, StoreEntry } from "./store.js";
import mime from 'mime-types';

type EntryAttrs = Record<string, any>;

export interface EntryIndex {
  entry: StoreEntry | null;
  children: FsNode[];
  assets: StoreAsset[];
}

type IndexFn<T extends FsNode> = (
  node: T, parentPath: string | null, order: number,
) => Promise<EntryIndex | null>;

interface FileIndexer {
  nodeType: 'file',
  index: IndexFn<FileNode>;
}

interface FolderIndexer {
  nodeType: 'folder',
  index: IndexFn<FolderNode>;
}

interface NodeIndexer {
  nodeType: 'node',
  index: IndexFn<FsNode>;
}

type Indexer = FileIndexer | FolderIndexer | NodeIndexer;

interface AssetTag {
  tag: '!asset',
  path: string,
}

const isAssetTag = (value: unknown): value is AssetTag => {
  return (
    typeof value === 'object'
    && value !== null
    && 'tag' in value
    && value.tag === '!asset'
    && 'path' in value
    && typeof value.path === 'string'
  );
}

const assetTag: ScalarTag = {
  tag: '!asset',
  resolve(str: string): AssetTag {
    return {
      tag: '!asset',
      path: str,
    }
  }
}

export const collectFolderNodes = async (folder: FolderNode): Promise<FsNode[]> => {
  const dirents = await fs.readdir(folder.fsPath, { withFileTypes: true });
  const fsNodes: FsNode[] = [];
  
  for (const dirent of dirents) {
    if (dirent.name === 'entry.ff.yml') {
      continue;
    }

    const fsPath = path.resolve(folder.fsPath, dirent.name);
    const node = await readNode(fsPath);
    if (node !== null) {
      fsNodes.push(node);
    }
  }

  return fsNodes;
}

export const readNodes = async (fsPaths: string[]): Promise<FsNode[]> => {
  const nodes: FsNode[] = [];
  for (const fsPath of fsPaths) {
    const node = await readNode(fsPath);
    if (node !== null) {
      nodes.push(node);
    }
  }

  return nodes;
}

export const toTitle = (str: string): string => {
  return str.length === 0 ? '' : str[0].toUpperCase() + str.slice(1);
}

export const createEntry = (
  source: FsNode,
  parentPath: string | null,
  order: number,
  attrs: EntryAttrs,
  entityType?: string,
): StoreEntry | null => {
  const mimeType = source.nodeType === 'file'
    ? mime.lookup(source.ext) || 'application/octet-stream'
    : 'application/x-directory';

  const schema = source.entityType ?? entityType ?? null;
  if (schema === null) {
    return null;
  }

  return {
    source,
    name: source.baseName,
    path: `${parentPath ?? ''}/${source.baseName}`,
    schema,
    parent: parentPath,
    access: 'public',
    title: attrs.title ?? toTitle(source.baseName),
    order,
    mime: mimeType,
    attrs,
  };
}

export const indexFolder = async (
  folder: FolderNode, parentPath: string | null, order: number,
): Promise<EntryIndex> => {
  try {
    const content = await fs.readFile(
      path.join(folder.fsPath, 'entry.ff.yml'),
      'utf-8'
    );
    const parsed = yaml.parse(content, { customTags: [assetTag] });
    const attrs: EntryAttrs = {};
    const assets: StoreAsset[] = [];

    for (const key in parsed) {
      if (!key.startsWith('_')) {
        const value = parsed[key];
        if (isAssetTag(value)) {
          const fsPath = path.join(folder.fsPath, value.path);
          assets.push({
            entryPath: `${parentPath ?? ''}/${folder.baseName}`,
            resourcePath: value.path,
            fsPath,
          });
          attrs[key] = value.path;
        } else {
          attrs[key] = value;
        }
      }
    }

    const entry = createEntry(folder, parentPath, order, attrs);
    if (parsed._include === undefined) {
      return {
        entry,
        assets,
        children: await collectFolderNodes(folder),
      };
    }

    if (
      Array.isArray(parsed._include)
      && parsed._include.every((x: unknown) => typeof x === 'string')
    ) {
      const fsPaths = (parsed._include as string[]).map(
        (p) => path.resolve(folder.fsPath, p)
      );
      return {
        entry,
        assets,
        children: await readNodes(fsPaths),
      };
    }
  } catch (error) {
    if (
      error instanceof Error
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      void 0; // It's okay if the entry file doesn't exist.
    } else {
      console.error('Error reading folder:', folder.fsPath, error);
    }
  }

  return {
    entry: createEntry(folder, parentPath, order, {}),
    children: await collectFolderNodes(folder),
    assets: [],
  };
}

export interface AssetContent {
  data: Buffer,
  contentType: string,
}

export class Filefish {
  private store: FilefishStore;
  private indexers: Map<string, Indexer>;

  public constructor(store: FilefishStore, indexers?: Map<string, Indexer>) {
    this.store = store;
    this.indexers = indexers ?? new Map();
  }

  public register(entityType: string, indexer: Indexer): Filefish {
    return new Filefish(
      this.store,
      new Map(this.indexers).set(entityType, indexer)
    );
  }

  public async indexPath(fsPath: string): Promise<void> {
    const node = await readNode(fsPath);
    if (node === null) {
      return;
    }
  
    if (node.nodeType === 'file') {
      return this.indexFile(node, null, 0);
    }
  
    return this.indexFolder(node, null, 0);
  };

  public async loadAsset(assetPath: string): Promise<AssetContent | null> {
    const [entryPath, resourcePath] = assetPath.split('/!asset/');
    const cursor = await this.store.findEntry(entryPath);
    if (cursor === 'not-found') {
      return null;
    }

    const asset = await this.store.findAsset(entryPath, resourcePath);
    if (asset === 'not-found') {
      return null;
    }

    const data = await fs.readFile(asset.fsPath);
    return { 
      data,
      contentType: mime.lookup(asset.fsPath) || 'application/octet-stream',
    };
  }

  private async processIndex(
    index: EntryIndex, parentPath: string | null,
  ): Promise<void> {
    if (index.entry !== null) {
      await this.store.putEntry(index.entry);
    }

    for (const asset of index.assets) {
      await this.store.putAsset(asset);
    }

    const currentPath = index.entry === null ? parentPath : index.entry.path;
    for (let i = 0; i < index.children.length; i++) {
      const fsNode = index.children[i];
      fsNode.nodeType === 'file'
        ? await this.indexFile(fsNode, currentPath, i)
        : await this.indexFolder(fsNode, currentPath, i);
    }
  }

  private async indexFile(
    file: FileNode,
    parentPath: string | null,
    order: number,
  ): Promise<void> {
    if (file.entityType === null) {
      return;
    }

    const indexer = this.indexers.get(file.entityType);
    const index = indexer === undefined || indexer.nodeType === 'folder'
      ? {
        entry: createEntry(file, parentPath, order, {}),
        children: [],
        assets: [],
      } 
      : await indexer.index(file, parentPath, order);

    if (index === null) {
      return;
    }

    await this.processIndex(index, parentPath);
  }

  private async indexFolder(
    folder: FolderNode,
    parentPath: string | null,
    order: number,
  ): Promise<void> {
    const indexer = folder.entityType === null
      ? undefined
      : this.indexers.get(folder.entityType);

    const index = indexer === undefined || indexer.nodeType === 'file'
      ? await indexFolder(folder, parentPath, order)
      : await indexer.index(folder, parentPath, order);

    if (index === null) {
      return;
    }

    await this.processIndex(index, parentPath);
  }
}
