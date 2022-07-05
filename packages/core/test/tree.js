import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootEntry = new PlainFolderEntry({
  contentPath: '',
  fsPath: 'test/content',
  link: 'content',
  title: 'The World'
}, [
  new PlainFolderEntry({
    contentPath: '/europe',  
    fsPath: 'test/content/europe',
    link: 'europe',
    title: 'The Continent of Europe',
  }, [
    new PlainTextEntry({
      contentPath: '/europe/czechia',  
      fsPath: 'test/content/europe/czechia.txt',
      link: 'czechia',
      title: 'czechia',
    })
  ]),
]);
