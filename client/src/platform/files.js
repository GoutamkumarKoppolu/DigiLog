// Getting files out of the app, shared by features (backups, bills).
//
// In a browser that's a normal download or a new tab. In the Android app
// downloads don't work inside the WebView, so the file is written to the app
// cache and handed to another app: the share sheet (Drive, Files, WhatsApp,
// email…) or, to view it, whichever app opens that file type (FileViewer,
// android/.../FileViewerPlugin.java).
//
// Large files are written in chunks: everything sent to native code travels
// as one string, and a 100 MB string can run the WebView out of memory.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const FileViewer = registerPlugin("FileViewer");

const TEXT_CHUNK = 4 * 1024 * 1024; // characters
const BYTE_CHUNK = 3 * 1024 * 1024; // bytes; a multiple of 3 so each base64 chunk decodes on its own

export const isNative = () => Capacitor.isNativePlatform();
const isCancel = (e) => /cancel/i.test(e?.message || "");

// Keeps a name safe for the cache folder: letters, digits, dot, dash, underscore.
export const safeFileName = (name) => String(name || "file").replace(/[^\w.-]+/g, "_").slice(0, 120) || "file";

async function writeChunks(path, chunks, encoding, directory = Directory.Cache) {
  let uri = null;
  for (let i = 0; i < chunks.length; i++) {
    const options = { path, data: chunks[i], directory, ...(encoding && { encoding }) };
    if (i === 0) ({ uri } = await Filesystem.writeFile({ ...options, recursive: true }));
    else await Filesystem.appendFile(options);
  }
  return uri;
}

// Folder inside the phone's Documents where backups are saved.
export const DEVICE_FOLDER = "Expense Tracker";

// Saves a text file into Documents/Expense Tracker on the phone, where the
// Files app (and the Import button's picker) can find it. Android 10 and
// older ask for storage permission first; newer versions don't need it for
// files the app creates. Resolves to the path to show the user.
export async function saveTextToDevice(fileName, contents) {
  if (!isNative()) {
    download(fileName, new Blob([contents], { type: "application/json" }));
    return `your Downloads folder as ${fileName}`;
  }
  let { publicStorage } = await Filesystem.checkPermissions();
  if (publicStorage !== "granted") ({ publicStorage } = await Filesystem.requestPermissions());
  if (publicStorage !== "granted") throw new Error("Storage permission is needed to save to your phone. Use Share instead.");
  await writeChunks(`${DEVICE_FOLDER}/${safeFileName(fileName)}`, textChunks(contents), Encoding.UTF8, Directory.Documents);
  return `Documents › ${DEVICE_FOLDER} › ${safeFileName(fileName)}`;
}

function textChunks(text) {
  const chunks = [];
  for (let i = 0; i < text.length; ) {
    let end = Math.min(i + TEXT_CHUNK, text.length);
    // Don't split an emoji (a surrogate pair) across two writes.
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end -= 1;
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks.length ? chunks : [""];
}

// Base64 of a Blob, without the "data:...;base64," prefix.
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(",") + 1));
    reader.onerror = () => reject(reader.error || new Error("Couldn't read the file"));
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, type = "") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

async function writeBlobToCache(fileName, blob) {
  const chunks = [];
  let start = 0;
  do {
    chunks.push(await blobToBase64(blob.slice(start, start + BYTE_CHUNK)));
    start += BYTE_CHUNK;
  } while (start < blob.size);
  return writeChunks(safeFileName(fileName), chunks);
}

function download(fileName, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Resolves to true when the file was saved/shared, false if the user
// cancelled the share sheet.
export async function saveTextFile(fileName, contents) {
  if (isNative()) {
    const uri = await writeChunks(safeFileName(fileName), textChunks(contents), Encoding.UTF8);
    try {
      await Share.share({ title: fileName, dialogTitle: "Save your backup", files: [uri] });
      return true;
    } catch (e) {
      if (isCancel(e)) return false;
      throw e;
    }
  }
  download(fileName, new Blob([contents], { type: "application/json" }));
  return true;
}

// files: [{ name, blob }]. Resolves to false if the user cancelled.
export async function shareFiles(files, title) {
  if (isNative()) {
    const uris = [];
    // Numbered so two pages with the same name don't overwrite each other.
    for (const [i, f] of files.entries()) uris.push(await writeBlobToCache(`${i + 1}-${f.name}`, f.blob));
    try {
      await Share.share({ title, dialogTitle: title, files: uris });
      return true;
    } catch (e) {
      if (isCancel(e)) return false;
      throw e;
    }
  }
  if (navigator.canShare?.({ files: files.map((f) => new File([f.blob], f.name, { type: f.blob.type })) })) {
    try {
      await navigator.share({ title, files: files.map((f) => new File([f.blob], f.name, { type: f.blob.type })) });
      return true;
    } catch (e) {
      if (e?.name === "AbortError") return false;
      throw e;
    }
  }
  files.forEach((f) => download(f.name, f.blob));
  return true;
}

// Shows the file in the phone's own viewer (PDF reader, gallery). Falls back
// to the share sheet if this build has no FileViewer. On the web it opens in
// a new tab, where the browser shows PDFs and images itself.
export async function openFile(name, blob) {
  if (isNative()) {
    const uri = await writeBlobToCache(name, blob);
    try {
      await FileViewer.open({ path: uri, mimeType: blob.type || "*/*" });
      return;
    } catch (e) {
      if (e?.code === "NO_APP") throw new Error("No app on this phone can open this file. Try Share instead.");
      await Share.share({ title: name, dialogTitle: `Open ${name}`, files: [uri] }).catch((err) => {
        if (!isCancel(err)) throw err;
      });
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
