import path from 'path';

export type Extra = { [Key: string]: unknown };

export interface BaseFSysNode {
  readonly contentPath: string;
  readonly fsPath: string;
  readonly name: string;
  readonly title: string,
  readonly extra?: Extra,
}

export interface FileNode extends BaseFSysNode {
  readonly type: 'file';
  readonly extension: string | null;
}

export interface FolderNode extends BaseFSysNode {
  readonly type: 'folder';
}

export type FSysNode = FileNode | FolderNode;

export const createFolderNode = (folderPath: string, contentPath: string = ''): FolderNode => {
  const parsed = path.parse(folderPath);
  return {
    type: 'folder',
    contentPath,
    fsPath: path.join(folderPath, ''), // path normalization
    name: parsed.name,
    title: parsed.name,
  };
};
