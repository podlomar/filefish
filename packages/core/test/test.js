import assert from 'assert';
import { rootEntry} from './tree.js';
import { Cms } from '../dist/index.js';
import { PlainTextEntry } from '../dist/plain/entries.js';
import { PlainFolderLoader } from '../dist/plain/loaders.js';

const cms = await Cms.load(new PlainFolderLoader(), './test/content');
// const entry = cms.rootEntry.find('/folder01/sample01', PlainTextEntry);
// const textFile = await entry.fetch(); 

it('well formed entry tree', () => {
  assert.deepStrictEqual(cms.rootEntry, rootEntry);
});