import { Entry } from "./entry";

export interface EntryLoader<E extends Entry<any>> {
  load(path: string): Promise<E>;
}