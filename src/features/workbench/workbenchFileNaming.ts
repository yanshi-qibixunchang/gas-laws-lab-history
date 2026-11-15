type NamedFile = { id: string; name: string };

// Match Windows-style names without changing the spelling of existing unique names.
const nameKey = (name: string) => name.trim().normalize('NFC').toLowerCase();

const allocateName = (requestedName: string, occupied: Set<string>) => {
  const name = requestedName.trim();
  if (!occupied.has(nameKey(name))) return name;
  const base = name.replace(/\s*[（(][1-9]\d*[)）]$/u, '').trim() || name;
  let suffix = 1;
  while (occupied.has(nameKey(`${base} (${suffix})`))) suffix += 1;
  return `${base} (${suffix})`;
};

export const getUniqueWorkbenchFileName = (
  requestedName: string,
  files: readonly NamedFile[],
  excludeFileId?: string,
) => allocateName(requestedName, new Set(
  files.filter((file) => file.id !== excludeFileId).map((file) => nameKey(file.name)),
));

/** Rename duplicate metadata only; reserve existing numbered names before allocating suffixes. */
export const normalizeWorkbenchFileNameCollections = <T extends NamedFile>(
  files: T[],
  closedFiles: T[],
) => {
  const allFiles = [...files, ...closedFiles];
  const occupied = new Set(allFiles.map((file) => nameKey(file.name)));
  const claimed = new Set<string>();
  const normalize = (collection: T[]) => {
    let changed = false;
    const next = collection.map((file) => {
      const key = nameKey(file.name);
      if (!claimed.has(key)) {
        claimed.add(key);
        return file;
      }
      const name = allocateName(file.name, occupied);
      occupied.add(nameKey(name));
      claimed.add(nameKey(name));
      changed = true;
      return { ...file, name };
    });
    return changed ? next : collection;
  };
  return { files: normalize(files), closedFiles: normalize(closedFiles) };
};
