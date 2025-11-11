import { NFTStorage, File } from "nft.storage";
import fs from "fs/promises";
import path from "path";
import 'dotenv/config';
console.log("Key loaded:", !!process.env.NFTSTORAGE_API_KEY);

const client = new NFTStorage({ token: process.env.NFTSTORAGE_API_KEY.trim() });
const dir = "nft_assets";

async function* walk(d) {
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const files = [];
for await (const f of walk(dir)) {
  files.push(new File([await fs.readFile(f)], path.relative(dir, f)));
}

try {
  const cid = await client.storeDirectory(files);
  console.log("✅ Uploaded:", cid);
  console.log(`Example: https://ipfs.io/ipfs/${cid}/comb_1.mp4`);
} catch (err) {
  console.error("❌ Upload failed.");
  console.error(err?.message || err);
  // nft.storage often includes a Response on errors:
  if (err?.response) {
    console.error("Status:", err.response.status, err.response.statusText);
    try { console.error("Body:", await err.response.text()); } catch {}
  }
  process.exit(1);
}
