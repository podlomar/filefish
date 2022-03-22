import { promises as fs } from 'fs';
import path from 'path';
import { Content } from './content.js';
import { Entry, EntryBase, EntryLoader, LoaderContext } from "./index.js";

export type TextFile = Content<'txtfile', {}, { content: string }>;

export class TextFileEntry extends Entry<TextFile> {
  private fileContent: string;

  public constructor(base: EntryBase, fileContent: string) {
    super(base, 'txtfile');

    this.fileContent = fileContent;
  }

  public async fetch(): Promise<TextFile> {
    return {
      type: 'txtfile',
      public: {},
      full: {
        content: this.fileContent,
      }
    }
  }
}

export class TextFileLoader implements EntryLoader<TextFile> {
  public readonly type: TextFile['type'] = 'txtfile';

  public async load<U extends Content<any, any, any>>(context: LoaderContext<U>, filePath: string): Promise<Entry<TextFile>> {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsed = path.parse(filePath);
    const base: EntryBase = {
      link: parsed.name,
      title: parsed.base,
    };

    return new TextFileEntry(base, fileContent);
  }
}
