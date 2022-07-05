import { PlainFolderEntry, PlainTextEntry } from "../dist/plain/entries.js";

export const rootEntry = new PlainFolderEntry({
  fsNode: {
    type: 'folder',
    contentPath: '/',
    fsPath: 'test/content',
    name: 'content',
    title: 'content'
  },
  title: 'The World'
}, [
  new PlainFolderEntry({
    fsNode: {
      type: 'folder',
      fsPath: 'test/content/europe',
      contentPath: '/europe',
      name: 'europe',
      title: 'europe',
      extra: undefined,
    },
    title: 'The Continent of Europe',
  }, [
    new PlainTextEntry({
      fsNode: {
        type: 'file',
        fsPath: 'test/content/europe/czechia.txt',
        extension: 'txt',
        contentPath: '/europe/czechia',
        name: 'czechia',
        title: 'czechia',
        extra: undefined,
      },
      title: 'czechia',
    })
  ]),
]);
