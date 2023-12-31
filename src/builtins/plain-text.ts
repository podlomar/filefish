import { promises as fs } from "fs";
import { FileNode, FolderNode, FsNode, folder } from "fs-inquire";
import { defineContentType } from "../content-type.js";
import { IndexEntry, Indexer, LeafEntry, ParentEntry } from "../indexer.js";
import { Cursor } from "../cursor.js";
import { LoadError, Loader } from "../loader.js";
import { Result } from "monadix/result";

export interface FolderItem {
  readonly type: 'file' | 'folder';
  readonly name: string;
  readonly path: string;
}

export interface FolderContent {
  readonly items: FolderItem[];
}

export const PlainTextContentType = defineContentType('text/plain', {
  indexNode: async (node: FileNode, indexer: Indexer): Promise<LeafEntry> => {
    return indexer.buildLeafEntry(node, 'public', {});
  },
  loadContent: async (cursor: Cursor<LeafEntry>, loader: Loader): Promise<Result<string, LoadError>> => {
    const fileContent = await fs.readFile(cursor.entry().fsNode.path, 'utf-8');
    return Result.success(fileContent)
  },
});

export const FolderContentType = defineContentType('folder', {
  indexNode: async (node: FolderNode, indexer: Indexer): Promise<ParentEntry> => {
    const nodes = folder(node).select.nodes.all().getOrElse([] as FsNode[]);
    const subEntries = await Promise.all(
      nodes.map((node: FsNode): Promise<IndexEntry> => node.type === 'file'
        ? PlainTextContentType.indexNode(node, indexer)
        : FolderContentType.indexNode(node, indexer)
      )
    );

    return indexer.buildParentEntry(node, 'public', {}, subEntries);
  },
  loadContent: async (
    cursor: Cursor<ParentEntry>, loader: Loader
  ): Promise<Result<FolderContent, LoadError>> => {
    const items = cursor.children().map((c: Cursor): FolderItem => {
      return {
        type: c.entry().type === 'leaf' ? 'file' : 'folder',
        name: c.entry().name,
        path: c.contentPath(),
      };
    });

    return Result.success({ items });
  },
});
