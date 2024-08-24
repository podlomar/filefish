import { Filefish } from "./filefish.js";
import { MemoryStore } from "./memory-store.js";

const file = process.argv[2];
if (file === undefined) {
  console.error('Usage: node src/index.js <path>');
  process.exit(1);
}

const store = new MemoryStore();
const filefish = new Filefish(store);
await filefish.indexPath(file);

console.log(store.dump());
