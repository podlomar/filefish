import { Cursor } from "./cursor.js";

export type LoadError = 'not-found' | 'wrong-content-type' | 'forbidden';

export interface Loader {
  readonly assetBasePath: string;
  buildAssetUrlPath(cursor: Cursor, assetName: string): string;
}

export class FilefishLoader implements Loader {
  public readonly assetBasePath: string;

  public constructor(assetBasePath: string) {
    this.assetBasePath = assetBasePath;
  }

  public buildAssetUrlPath(cursor: Cursor, assetName: string): string {
    return `${this.assetBasePath}${cursor.contentPath()}/${assetName}`;
  }
};
