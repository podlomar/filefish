import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootBase = {
  contentPath: '',
  fsPath: 'test/content',
  link: 'content',
  title: 'The World'
};

export const europeBase = {
  contentPath: '/europe',  
  fsPath: 'test/content/europe',
  link: 'europe',
  title: 'The Continent of Europe',
}

export const czechiaBase = {
  contentPath: '/europe/czechia',  
  fsPath: 'test/content/europe/czechia.txt',
  link: 'czechia',
  title: 'czechia',
}

export const czechiaEntry = new PlainTextEntry(czechiaBase);

export const europeEntry = new PlainFolderEntry(europeBase, [czechiaEntry]);

export const rootEntry = new PlainFolderEntry(rootBase, [europeEntry]);
