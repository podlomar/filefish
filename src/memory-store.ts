import { StoreEntry, FilefishStore, StoreAsset, Cursor, publicAgent } from "./store.js";

export class MemoryStore implements FilefishStore {
  private entries: StoreEntry[] = [];
  private assets: { [path: string]: string } = {};

  public async findEntry(entryPath: string): Promise<Cursor | 'not-found'> {
    const segments = entryPath.split('/').slice(1);
    let currentPath: string = '';
    const pathEntries: StoreEntry[] = [];
    for (const segment of segments) {
      currentPath = `${currentPath}/${segment}`;
      const entry = this.entries.find((entry) => entry.path === currentPath);
      if (!entry) {
        return 'not-found';
      }

      pathEntries.push(entry);
    }

    return new Cursor(
      this,
      pathEntries,
      publicAgent,
    );
  }

  public async putEntry(entry: StoreEntry): Promise<void> {
    this.entries.push(entry);
  }

  public async deleteEntry(entryPath: string): Promise<void> {
    this.entries = this.entries.filter((entry) => entry.path !== entryPath);
  }

  public async findChildren(entryPath: string): Promise<StoreEntry[]> {
    return this.entries.filter((entry) => entry.parent === entryPath);
  }

  public async putAsset(asset: StoreAsset): Promise<void> {
    this.assets[asset.path] = asset.fsPath;
  }

  public async deleteAsset(assetPath: string): Promise<void> {
    delete this.assets[assetPath];
  }

  public async findAsset(assetPath: string): Promise<StoreAsset | 'not-found'> {
    if (assetPath in this.assets) {
      return { path: assetPath, fsPath: this.assets[assetPath] };
    } else {
      return 'not-found';
    }
  }

  public dump(): string {
    return `${JSON.stringify(this.entries, null, 2)}\n${JSON.stringify(this.assets, null, 2)}`;
  }
}
