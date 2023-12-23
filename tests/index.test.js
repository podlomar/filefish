import { describe } from 'mocha';
import mock from 'mock-fs';
import { expect } from 'chai';
import mockfiles from './mockfiles.js';
import { Filefish } from '../dist/index.js';
import { FolderContentType } from '../dist/builtins/plain-text.js';
import plainindex from './plainindex.js';
import exp from 'constants';

describe('Plain text and folders', () => {
  before(() => {
    mock(mockfiles);
  });

  after(() => {
    mock.restore();
  });

  it('Should index all folders and files', async () => {
    const filefish = await Filefish.create('/projects', FolderContentType);
    expect(filefish.rootEntry).to.deep.equal(plainindex);
  });
});

