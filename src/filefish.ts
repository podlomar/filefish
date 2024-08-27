import path from 'path';
import fs from 'fs/promises';
import yaml, { ScalarTag } from 'yaml';
import { FileNode, FolderNode, FsNode, readNode } from "./fsys.js";
import { FilefishStore, StoreAsset, StoreEntry } from "./store.js";
import mime from 'mime-types';

type EntryAttrs = Record<string, any>;

export interface EntryIndex {
  entry: StoreEntry | null;
  childNodes: FsNode[];
  assets: StoreAsset[];
}

type IndexFn<TNode extends FsNode> = (
  context: IndexingContext<TNode>,
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
  fsNode: FsNode,
  parentPath: string | null,
  order: number,
  attrs: EntryAttrs,
  entityType?: string,
): StoreEntry | null => {
  const mimeType = fsNode.nodeType === 'file'
    ? mime.lookup(fsNode.ext) || 'application/octet-stream'
    : 'application/x-directory';

  const schema = fsNode.entityType ?? entityType ?? null;
  if (schema === null) {
    return null;
  }

  return {
    nodeType: fsNode.nodeType,
    fsPath: fsNode.fsPath,
    name: fsNode.baseName,
    path: `${parentPath ?? ''}/${fsNode.baseName}`,
    schema,
    parent: parentPath,
    access: 'public',
    title: attrs.title ?? toTitle(fsNode.baseName),
    order,
    mime: mimeType,
    attrs,
  };
}

type IncludeItem = string | {
  file: string,
  type: string,
};

interface EntryFile {
  [key: string]: any,
  _include?: IncludeItem[],
}

export const indexFolder = async (
  folder: FolderNode, parentPath: string | null, order: number,
): Promise<EntryIndex> => {
  try {
    const content = await fs.readFile(
      path.join(folder.fsPath, 'entry.ff.yml'),
      'utf-8'
    );
    const entryFile: EntryFile = yaml.parse(content, { customTags: [assetTag] });
    const attrs: EntryAttrs = {};
    const assets: StoreAsset[] = [];

    for (const key in entryFile) {
      if (!key.startsWith('_')) {
        const value = entryFile[key];
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
    if (entryFile._include === undefined) {
      return {
        entry,
        assets,
        childNodes: await collectFolderNodes(folder),
      };
    }

    const children: FsNode[] = [];
    for (const includeItem of entryFile._include) {
      if (typeof includeItem === 'string') {
        const fsPath = path.resolve(folder.fsPath, includeItem);
        const node = await readNode(fsPath);
        if (node !== null) {
          children.push(node);
        }
      } else {
        const fsPath = path.resolve(folder.fsPath, includeItem.file);
        const node = await readNode(fsPath, includeItem.type);
        if (node !== null) {
          node.entityType = includeItem.type;
          children.push(node);
        }
      }
    }
    
    return { entry, assets, childNodes: children };
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
    childNodes: await collectFolderNodes(folder),
    assets: [],
  };
}

export interface AssetContent {
  data: Buffer,
  contentType: string,
}

export class IndexingContext<TNode extends FsNode> {
  public readonly fsNode: TNode;
  public readonly schema: string | null;
  public readonly parentPath: string | null;
  public readonly order: number;
  public entryAttrs: EntryAttrs = {};

  private assets: StoreAsset[] = [];
  private childNodes: FsNode[] = [];

  public constructor(
    fsNode: TNode, schema: string | null, parentPath: string | null, order: number
  ) {
    this.fsNode = fsNode;
    this.schema = schema;
    this.parentPath = parentPath;
    this.order = order;
  }

  public addAsset(resourcePath: string): void {
    this.assets.push({
      entryPath: `${this.parentPath ?? ''}/${this.fsNode.baseName}`,
      resourcePath,
      fsPath: path.join(this.fsNode.fsPath, resourcePath),
    });
  }

  public async insertChildNode(fsPath: string, schema: string): Promise<FsNode | null> {
    const fsNode = await readNode(fsPath, schema);
    if (fsNode === null) {
      return null;
    }

    this.childNodes.push(fsNode);
    return fsNode;
  }

  public createIndex(): EntryIndex {
    return {
      entry: createEntry(
        this.fsNode, this.parentPath, this.order, this.entryAttrs, this.schema ?? undefined
      ),
      childNodes: this.childNodes,
      assets: this.assets,
    };
  }
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
    for (let i = 0; i < index.childNodes.length; i++) {
      const fsNode = index.childNodes[i];
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
        childNodes: [],
        assets: [],
      } 
      : await indexer.index(new IndexingContext(file, file.entityType, parentPath, order));

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
      : await indexer.index(new IndexingContext(folder, folder.entityType, parentPath, order));

    if (index === null) {
      return;
    }

    await this.processIndex(index, parentPath);
  }
}
