import path from 'path';

export interface BaseFSysNode {
  readonly fsPath: string;
  readonly title: string;
  readonly name: string;
}

export interface FileNode extends BaseFSysNode {
  readonly type: 'file';
  readonly extension: string;
}

export interface FolderNode extends BaseFSysNode {
  readonly type: 'folder';
}

export type FSysNode = FileNode | FolderNode;

export const createFolderNode = (folderPath: string): FolderNode => {
  const parsed = path.parse(folderPath);
  return {
    type: 'folder',
    fsPath: folderPath,
    name: parsed.name,
    title: parsed.name,
  };
};
