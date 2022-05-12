import { Cms } from '../dist/index.js';
import { FileEntry, FolderEntry, FolderLoader } from '../dist/fsnodes.js';

const cms = await Cms.load(new FolderLoader(), './content');
const entry = cms.rootEntry.find('/folder01/sample01', FileEntry);
console.log(entry);