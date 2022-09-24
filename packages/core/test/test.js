import assert from 'assert';
import { czechiaBase, pragueEntry, czechiaEntry, europeBase, europeEntry, rootBase, rootEntry, africaEntry} from './tree.js';
import { Cms } from '../dist/index.js';
import { PlainFolderEntry, PlainTextEntry } from '../dist/plain/entries.js';
import { PlainFolderLoader } from '../dist/plain/loaders.js';
import { AllAccess, NoAccess } from '../dist/access-control.js';

const cms = await Cms.load(new PlainFolderLoader(null), './test/content', '/content');
const allAccess = new AllAccess();

it('well formed entry tree', () => {
  assert.deepStrictEqual(cms.rootEntry, rootEntry);
});

it('cms summary', () => {
  assert.deepStrictEqual(
    cms.collectSummary(), 
    { 
      totalEntries: 6,
      problems: [
        { message: "No file with name 'morocco'", path: '/content/africa' }
      ]
    }
  );
});

describe('find entries', () => {
  it('success find', () => {
    assert.deepStrictEqual(cms.find('/content', PlainFolderEntry, allAccess), rootEntry);
    assert.deepStrictEqual(cms.find('/content/europe', PlainFolderEntry, allAccess), europeEntry);
    assert.deepStrictEqual(cms.find('/content/europe/czechia', PlainFolderEntry, allAccess), czechiaEntry);
    assert.deepStrictEqual(cms.find('/content/europe/czechia/prague', PlainTextEntry, allAccess), pragueEntry);
  });
  it('wrong type', () => {
    assert.deepStrictEqual(cms.find('/europe', PlainTextEntry), 'not-found');
  });
  it('wrong path', () => {
    assert.deepStrictEqual(cms.find('/czechia', PlainTextEntry), 'not-found');
  });
});

it('bases path', () => {
  assert.deepStrictEqual(
    cms.rootEntry.find('/europe/czechia', PlainFolderEntry, allAccess).getBasesPath(),
    [rootBase, europeBase, czechiaBase],
  );
});

it('siblings', () => {
  assert.deepStrictEqual(cms.rootEntry.getPrevSibling(0, allAccess), null);
  assert.deepStrictEqual(cms.rootEntry.getNextSibling(0, allAccess), africaEntry);
  assert.deepStrictEqual(cms.rootEntry.getPrevSibling(1, allAccess), europeEntry);
  assert.deepStrictEqual(cms.rootEntry.getNextSibling(1, allAccess), null);
});

const noAccess = new NoAccess();

it('no access', () => {
  assert.deepStrictEqual(cms.find('/content', PlainFolderEntry, noAccess), 'forbidden');
  assert.deepStrictEqual(cms.rootEntry.getPrevSibling(0, noAccess), null);
  assert.deepStrictEqual(cms.rootEntry.getNextSibling(0, noAccess), 'forbidden');
  assert.deepStrictEqual(cms.rootEntry.getPrevSibling(1, noAccess), 'forbidden');
  assert.deepStrictEqual(cms.rootEntry.getNextSibling(1, noAccess), null);
});
