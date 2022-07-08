import assert from 'assert';
import { czechiaBase, czechiaEntry, europeBase, europeEntry, rootBase, rootEntry} from './tree.js';
import { Cms } from '../dist/index.js';
import { PlainFolderEntry, PlainTextEntry } from '../dist/plain/entries.js';
import { PlainFolderLoader } from '../dist/plain/loaders.js';

const cms = await Cms.load(new PlainFolderLoader(null), './test/content', '/content');

it('well formed entry tree', () => {
  assert.deepStrictEqual(cms.rootEntry, rootEntry);
});

it('cms summary', () => {
  assert.deepStrictEqual(
    cms.collectSummary(), 
    { 
      totalEntries: 5,
      problems: [
        { message: "No file with name 'morocco'", path: '/content/africa' }
      ]
    }
  );
});

describe('find entries', () => {
  it('success find', () => {
    assert.deepStrictEqual(cms.find('/content', PlainFolderEntry), rootEntry);
    assert.deepStrictEqual(cms.find('/content/europe', PlainFolderEntry), europeEntry);
    assert.deepStrictEqual(cms.find('/content/europe/czechia', PlainTextEntry), czechiaEntry);
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