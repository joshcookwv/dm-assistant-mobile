import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";

const mapsDir = new Directory(Paths.document, "maps");

/** Copies a picked image into the app's persistent document directory so it survives restarts. */
export async function saveImageToMaps(pickedUri: string, extension: string): Promise<string> {
  if (!mapsDir.exists) {
    mapsDir.create({ intermediates: true });
  }
  const source = new File(pickedUri);
  const dest = new File(mapsDir, `${Crypto.randomUUID()}.${extension}`);
  await source.copy(dest);
  return dest.uri;
}
