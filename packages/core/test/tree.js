import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootBase = {
  contentPath: '/content',
  fsPath: 'test/content',
  link: 'content',
  title: 'The World'
};

export const europeBase = {
  contentPath: '/content/europe',  
  fsPath: 'test/content/europe',
  link: 'europe',
  title: 'The Continent of Europe',
}

export const africaBase = {
  contentPath: '/content/africa',  
  fsPath: 'test/content/africa',
  link: 'africa',
  title: 'africa',
}

export const czechiaBase = {
  contentPath: '/content/europe/czechia',  
  fsPath: 'test/content/europe/czechia.txt',
  link: 'czechia',
  title: 'Czech Republic',
}

export const egyptBase = {
  contentPath: '/content/africa/egypt',  
  fsPath: 'test/content/africa/egypt.txt',
  link: 'egypt',
  title: 'egypt',
}

export const czechiaEntry = new PlainTextEntry(czechiaBase);

export const egyptEntry = new PlainTextEntry(egyptBase);

export const europeEntry = new PlainFolderEntry(europeBase, [czechiaEntry]);

export const africaEntry = new PlainFolderEntry(africaBase, [egyptEntry]);

export const rootEntry = new PlainFolderEntry(rootBase, [europeEntry, africaEntry]);
