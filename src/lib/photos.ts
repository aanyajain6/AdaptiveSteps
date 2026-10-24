// ============================================================
// Photos for steps and review cards
// ============================================================
// The image picker returns files in a cache directory the OS may
// clear, so every picked photo is copied into the app's own
// document folder before its URI is stored. On web there is no
// file system: the photo is kept as a data: URI instead.

import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { newId } from "./db";

const PHOTO_DIR = "photos";

function photoDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTO_DIR);
  dir.create({ idempotent: true, intermediates: true });
  return dir;
}

async function toDataUri(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function persist(uri: string): Promise<string> {
  if (Platform.OS === "web") return toDataUri(uri);
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const dest = new File(photoDirectory(), `${newId()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/**
 * Opens the camera or photo library. Resolves to a stored URI, or
 * null if the parent cancelled or denied permission.
 */
export async function pickPhoto(source: "library" | "camera"): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.6, // step photos are reference pictures; keeps storage small
  };

  let result: ImagePicker.ImagePickerResult;
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted && Platform.OS !== "web") return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  if (result.canceled || !result.assets?.[0]) return null;
  return persist(result.assets[0].uri);
}

/** Deletes a stored photo. Safe to call with URIs this module didn't create. */
export function deletePhoto(uri: string | undefined): void {
  if (!uri || Platform.OS === "web" || !uri.includes(`/${PHOTO_DIR}/`)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A missing file is already the outcome we wanted.
  }
}
