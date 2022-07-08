import path from "path";
import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootBase = {
  contentPath: '/content',
  fsPath: path.resolve('test', 'content'),
  link: 'content',
  title: 'The World',
  problems: [],
};

export const europeBase = {
  contentPath: '/content/europe',  
  fsPath: path.resolve('test', 'content', 'europe'),
  link: 'europe',
  title: 'The Continent of Europe',
  problems: [],
}

export const africaBase = {
  contentPath: '/content/africa',  
  fsPath: path.resolve('test', 'content', 'africa'),
  link: 'africa',
  title: null,
  problems: [
    "No file with name 'morocco'",
  ],
}

export const czechiaBase = {
  contentPath: '/content/europe/czechia',  
  fsPath: path.resolve('test', 'content', 'europe', 'czechia.txt'),
  link: 'czechia',
  title: 'Czech Republic',
  problems: [],
}

export const egyptBase = {
  contentPath: '/content/africa/egypt',  
  fsPath: path.resolve('test', 'content', 'africa', 'egypt.txt'),
  link: 'egypt',
  title: null,
  problems: [],
}

export const czechiaEntry = new PlainTextEntry(czechiaBase);

export const egyptEntry = new PlainTextEntry(egyptBase);

export const europeEntry = new PlainFolderEntry(europeBase, [czechiaEntry]);

export const africaEntry = new PlainFolderEntry(africaBase, [egyptEntry]);

export const rootEntry = new PlainFolderEntry(rootBase, [europeEntry, africaEntry]);
