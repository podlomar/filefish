export interface PlainTextFile {
  content: string,
};

export interface FolderItem {
  link: string,
  type: 'folder' | 'file';
}

export interface PlainFolder {
  link: string,
  items: FolderItem[],
};