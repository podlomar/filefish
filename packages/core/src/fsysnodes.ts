import path from 'path';

export type Extra = { [Key: string]: unknown };

export interface BaseFSysNode {
  readonly contentPath: string;
  readonly fsPath: string;
  readonly name: string;
  readonly title: string | null,
  readonly extra: Extra | null,
}

export interface FileNode extends BaseFSysNode {
  readonly type: 'file';
  readonly extension: string | null;
}

export interface FolderNode extends BaseFSysNode {
  readonly type: 'folder';
}

export interface FailedNode {
  readonly type: 'failed';
  readonly problems: string[];
}

export type FSysNode = FileNode | FolderNode;

export type MaybeNode = FSysNode | FailedNode;

export const createFolderNode = (folderPath: string, contentPath: string = ''): FolderNode => {
  const parsed = path.parse(folderPath);
  return {
    type: 'folder',
    contentPath,
    fsPath: path.resolve(folderPath, ''),
    name: parsed.name,
    title: null,
    extra: null,
  };
};
