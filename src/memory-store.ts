import { StoreEntry, FilefishStore, StoreAsset, Cursor, publicAgent } from "./store.js";

export class MemoryStore implements FilefishStore {
  private entries: StoreEntry[] = [];
  private assets: StoreAsset[] = [];

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

  public async findChildren(entryPath: string, entryType?: string): Promise<StoreEntry[]> {
    return this.entries.filter(
      (entry) => (
        entry.parent === entryPath &&
        (entryType === undefined || entry.schema === entryType)
      )
    );
  }

  public async putAsset(asset: StoreAsset): Promise<void> {
    this.assets.push(asset);
  }

  public async deleteAsset(entryPath: string, resourcePath: string): Promise<void> {
    const index = this.assets.findIndex(
      (asset) => asset.entryPath === entryPath && asset.resourcePath === resourcePath
    );
    if (index !== -1) {
      this.assets.splice(index, 1);
    }
  }

  public async findAsset(
    entryPath: string, resourcePath: string
  ): Promise<StoreAsset | 'not-found'> {
    return this.assets.find(
      (asset) => asset.entryPath === entryPath && asset.resourcePath === resourcePath
    ) ?? 'not-found';
  }

  public dump(): string {
    return JSON.stringify({
      entries: this.entries,
      assets: this.assets,
    }, null, 2);
  }
}
