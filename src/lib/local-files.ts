import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";

/** Copies a picked image into the app's persistent document directory so it survives restarts. */
export async function saveImageToMaps(pickedUri: string, extension: string): Promise<string> {
  // Create native filesystem handles lazily so Expo Router's web renderer can
  // validate this route without instantiating an unsupported web Directory.
  const mapsDir = new Directory(Paths.document, "maps");
  if (!mapsDir.exists) {
    mapsDir.create({ intermediates: true });
  }
  const source = new File(pickedUri);
  const dest = new File(mapsDir, `${Crypto.randomUUID()}.${extension}`);
  await source.copy(dest);
  return dest.uri;
}
