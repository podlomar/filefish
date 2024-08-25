import path, { parse } from 'path';
import fs from 'fs/promises';

interface BaseNode {
  nodeType: 'file' | 'folder';
  entityType: string | null;
  baseName: string;
  fsPath: string;
}

export interface FileNode extends BaseNode {
  nodeType: 'file';
  ext: string;
}

export interface FolderNode extends BaseNode {
  nodeType: 'folder';
}

export type FsNode = FileNode | FolderNode;

export const readNode = async (
  fsPath: string, providedEntityType?: string
): Promise<FsNode | null> => {
  const regex = /^(.+)\((.+)\)/;
  try {
    const stat = await fs.stat(fsPath);
    const parsed = path.parse(fsPath);
    const match = parsed.name.match(regex);
    const matchedName = match === null
      ? parsed.name
      : match[1];
    const matchedEntityType = match === null
      ? null
      : match[2];
    
    if (stat.isDirectory()) {
      return {
        nodeType: 'folder',
        entityType: providedEntityType ?? matchedEntityType ?? null,
        fsPath: path.resolve(fsPath),
        baseName: matchedName,
      };
    }

    const entityType = providedEntityType ?? matchedEntityType;
    if (entityType === null) {
      return null;
    }

    return {
      nodeType: 'file',
      entityType,
      fsPath: path.resolve(fsPath),
      baseName: matchedName,
      ext: parsed.ext,
    };
  } catch (e) {
    console.error('Error reading node:', fsPath, e);
    return null;
  }
}
