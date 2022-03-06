import { Cms } from '../dist/index.js';
import { FolderLoader } from '../dist/folder.js';

const cms = Cms.create().use(new FolderLoader());
const a = await cms.load('folder', './content');

console.log(a);