import { CmsBuilder } from '../dist/index.js';
import { FolderLoader } from '../dist/folder.js';
import { TextFileLoader } from '../dist/text-file.js';
import { Query } from '../dist/query.js';

const cms = CmsBuilder
  .use(new FolderLoader())
  .use(new TextFileLoader())
  .root('folder');

await cms.loadRoot('./content');

const query = Query.of(cms);
const x = query.find('/folder01/sample01', 'txtfile');

console.log(x);