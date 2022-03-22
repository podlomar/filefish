import { CmsBuilder } from '../dist/index.js';
import { FolderLoader } from '../dist/folder.js';
import { TextFileLoader } from '../dist/text-file.js';

const cms = CmsBuilder
  .use(new FolderLoader())
  .use(new TextFileLoader())
  .root('folder');

await cms.loadRoot('./content');

console.log(cms.rootEntry.subEntries[0].subEntries[0]);