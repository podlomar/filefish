import path from "path";
import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootBase = {
  contentPath: '/content',
  fsPath: path.resolve('test', 'content'),
  link: 'content',
  title: 'The World',
  extra: null,
  problems: [],
};

export const europeBase = {
  contentPath: '/content/europe',  
  fsPath: path.resolve('test', 'content', 'europe'),
  link: 'europe',
  title: 'The Continent of Europe',
  extra: null,
  problems: [],
}

export const africaBase = {
  contentPath: '/content/africa',  
  fsPath: path.resolve('test', 'content', 'africa'),
  link: 'africa',
  title: null,
  extra: null,
  problems: [
    "No file with name 'morocco'",
  ],
}

export const czechiaBase = {
  contentPath: '/content/europe/czechia',  
  fsPath: path.resolve('test', 'content', 'europe', 'czechia'),
  link: 'czechia',
  title: 'The Czech Republic',
  extra: {
    lead: 'The Czech Republic, also known as Czechia is a landlocked country in Central Europe.',
    population: '10.7 million (2020)'
  },
  problems: [],
}

export const pragueBase = {
  contentPath: '/content/europe/czechia/prague',  
  fsPath: path.resolve('test', 'content', 'europe', 'czechia', 'prague.txt'),
  link: 'prague',
  title: null,
  extra: null,
  problems: [],
}

export const egyptBase = {
  contentPath: '/content/africa/egypt',  
  fsPath: path.resolve('test', 'content', 'africa', 'egypt.txt'),
  link: 'egypt',
  title: null,
  extra: null,
  problems: [],
}

export const pragueEntry = new PlainTextEntry(pragueBase);

export const czechiaEntry = new PlainFolderEntry(czechiaBase, [pragueEntry]);

export const egyptEntry = new PlainTextEntry(egyptBase);

export const europeEntry = new PlainFolderEntry(europeBase, [czechiaEntry]);

export const africaEntry = new PlainFolderEntry(africaBase, [egyptEntry]);

export const rootEntry = new PlainFolderEntry(rootBase, [europeEntry, africaEntry]);
