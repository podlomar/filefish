import assert from 'assert';
import { czechiaBase, czechiaEntry, europeBase, europeEntry, rootBase, rootEntry} from './tree.js';
import { Cms } from '../dist/index.js';
import { PlainFolderEntry, PlainTextEntry } from '../dist/plain/entries.js';
import { PlainFolderLoader } from '../dist/plain/loaders.js';

const cms = await Cms.load(new PlainFolderLoader(null), './test/content');

it('well formed entry tree', () => {
  assert.deepStrictEqual(cms.rootEntry, rootEntry);
});

describe('find entries', () => {
  it('success find', () => {
    assert.deepStrictEqual(cms.rootEntry.find('', PlainFolderEntry), rootEntry);
    assert.deepStrictEqual(cms.rootEntry.find('/europe', PlainFolderEntry), europeEntry);
    assert.deepStrictEqual(cms.rootEntry.find('/europe/czechia', PlainTextEntry), czechiaEntry);
  });
  it('wrong type', () => {
    assert.deepStrictEqual(cms.rootEntry.find('/europe', PlainTextEntry), null);
  });
  it('wrong path', () => {
    assert.deepStrictEqual(cms.rootEntry.find('/czechia', PlainTextEntry), null);
  });
});

it('base path', () => {
  assert.deepStrictEqual(
    cms.rootEntry.find('/europe/czechia', PlainTextEntry).getBasesPath(),
    [rootBase, europeBase, czechiaBase],
  );
});