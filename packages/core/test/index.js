import { Cms } from '../dist/index.js';
import { PlainTextEntry } from '../dist/plain/entries.js';
import { PlainFolderLoader } from '../dist/plain/loaders.js';

const cms = await Cms.load(new PlainFolderLoader(), './content');
console.log(JSON.stringify(cms.rootEntry, null, 2));
const entry = cms.rootEntry.find('/folder01/sample01', PlainTextEntry);
const textFile = await entry.fetch(); 
console.log(textFile.content);