export type WorkbenchPersistenceV3JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly WorkbenchPersistenceV3JsonValue[]
  | { readonly [key: string]: WorkbenchPersistenceV3JsonValue };

export type WorkbenchPersistenceV3CanonicalizationErrorCode =
  | 'unsupported-type'
  | 'non-finite-number'
  | 'sparse-array'
  | 'cyclic-reference'
  | 'unsupported-object'
  | 'unsupported-property';

export class WorkbenchPersistenceV3CanonicalizationError extends TypeError {
  readonly code: WorkbenchPersistenceV3CanonicalizationErrorCode;
  readonly path: string;

  constructor(
    code: WorkbenchPersistenceV3CanonicalizationErrorCode,
    path: string,
    detail: string,
  ) {
    super(`Cannot canonicalize persistence value at ${path}: ${detail}.`);
    this.name = 'WorkbenchPersistenceV3CanonicalizationError';
    this.code = code;
    this.path = path;
  }
}

export interface WorkbenchPersistenceV3Sha256Provider {
  digest(data: Uint8Array): Promise<ArrayBuffer | Uint8Array>;
}

export interface WorkbenchPersistenceV3FingerprintProvider {
  canonicalize(value: unknown): string;
  fingerprintCanonicalJson(canonicalJson: string): Promise<string>;
  fingerprint(value: unknown): Promise<string>;
}

const hasOwn = (value: object, key: PropertyKey) => (
  Object.prototype.hasOwnProperty.call(value, key)
);

const appendObjectPath = (path: string, key: string) => (
  /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`
);

const throwCanonicalizationError = (
  code: WorkbenchPersistenceV3CanonicalizationErrorCode,
  path: string,
  detail: string,
): never => {
  throw new WorkbenchPersistenceV3CanonicalizationError(code, path, detail);
};

const assertDataProperty = (
  owner: object,
  key: string,
  path: string,
) => {
  const descriptor = Object.getOwnPropertyDescriptor(owner, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throwCanonicalizationError(
      'unsupported-property',
      path,
      'only enumerable data properties are supported',
    );
  }
  return descriptor.value as unknown;
};

const assertNoSymbolProperties = (value: object, path: string) => {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throwCanonicalizationError(
      'unsupported-property',
      path,
      'symbol properties are not supported',
    );
  }
};

const isSharedArrayBuffer = (value: object): boolean => (
  typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
);

const canonicalizeValue = (
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): string => {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'string':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        return throwCanonicalizationError(
          'non-finite-number',
          path,
          'numbers must be finite',
        );
      }
      return Object.is(value, -0) ? '0' : JSON.stringify(value);
    case 'undefined':
    case 'bigint':
    case 'function':
    case 'symbol':
      return throwCanonicalizationError(
        'unsupported-type',
        path,
        `${typeof value} values are not supported`,
      );
    case 'object':
      break;
    default:
      return throwCanonicalizationError(
        'unsupported-type',
        path,
        `values of type ${typeof value} are not supported`,
      );
  }

  const objectValue = value as object;
  if (ancestors.has(objectValue)) {
    return throwCanonicalizationError(
      'cyclic-reference',
      path,
      'cyclic references are not supported',
    );
  }
  if (value instanceof Date) {
    return throwCanonicalizationError(
      'unsupported-object',
      path,
      'Date objects are not supported',
    );
  }
  if (value instanceof Map) {
    return throwCanonicalizationError(
      'unsupported-object',
      path,
      'Map objects are not supported',
    );
  }
  if (value instanceof Set) {
    return throwCanonicalizationError(
      'unsupported-object',
      path,
      'Set objects are not supported',
    );
  }
  if (
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer ||
    isSharedArrayBuffer(objectValue)
  ) {
    return throwCanonicalizationError(
      'unsupported-object',
      path,
      'binary buffers and typed-array views are not supported',
    );
  }

  ancestors.add(objectValue);
  try {
    if (Array.isArray(value)) {
      assertNoSymbolProperties(value, path);
      const ownKeys = Object.keys(value);
      for (const key of ownKeys) {
        const index = Number(key);
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= value.length ||
          String(index) !== key
        ) {
          return throwCanonicalizationError(
            'unsupported-property',
            appendObjectPath(path, key),
            'arrays may only contain indexed elements',
          );
        }
      }
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const itemPath = `${path}[${index}]`;
        if (!hasOwn(value, index)) {
          return throwCanonicalizationError(
            'sparse-array',
            itemPath,
            'sparse arrays are not supported',
          );
        }
        items.push(canonicalizeValue(
          assertDataProperty(value, String(index), itemPath),
          itemPath,
          ancestors,
        ));
      }
      return `[${items.join(',')}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return throwCanonicalizationError(
        'unsupported-object',
        path,
        'objects with custom prototypes are not supported',
      );
    }
    assertNoSymbolProperties(value, path);
    const keys = Object.getOwnPropertyNames(value);
    const serializedEntries = keys
      .sort()
      .map((key) => {
        const propertyPath = appendObjectPath(path, key);
        const propertyValue = assertDataProperty(value, key, propertyPath);
        return `${JSON.stringify(key)}:${canonicalizeValue(
          propertyValue,
          propertyPath,
          ancestors,
        )}`;
      });
    return `{${serializedEntries.join(',')}}`;
  } finally {
    ancestors.delete(objectValue);
  }
};

export const canonicalizeWorkbenchPersistenceV3Json = (
  value: unknown,
): string => canonicalizeValue(value, '$', new WeakSet());

// Compare the same supported JSON domain without allocating two complete
// canonical strings for every save-time integrity check. Fingerprints continue
// to use the canonical encoder above, so stored bytes and hashes do not change.
export const areWorkbenchPersistenceV3JsonValuesEqual = (
  left: unknown,
  right: unknown,
): boolean => {
  const leftAncestors = new WeakSet<object>();
  const rightAncestors = new WeakSet<object>();
  const compare = (a: unknown, b: unknown): boolean => {
    if (a === null || b === null) return a === null && b === null;
    if (typeof a !== typeof b) return false;
    if (typeof a === 'number') return Number.isFinite(a) && a === b;
    if (typeof a === 'string' || typeof a === 'boolean') return a === b;
    if (typeof a !== 'object' || typeof b !== 'object' || b === null) return false;
    if (
      leftAncestors.has(a) || rightAncestors.has(b) ||
      ArrayBuffer.isView(a) || ArrayBuffer.isView(b) ||
      Object.getOwnPropertySymbols(a).length > 0 ||
      Object.getOwnPropertySymbols(b).length > 0
    ) return false;
    const aArray = Array.isArray(a);
    const bArray = Array.isArray(b);
    if (aArray !== bArray) return false;
    const isPlain = (value: object) => {
      const prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    };
    if (!aArray && (!isPlain(a) || !isPlain(b))) return false;
    const compareProperty = (key: string) => {
      const ad = Object.getOwnPropertyDescriptor(a, key);
      const bd = Object.getOwnPropertyDescriptor(b, key);
      return !!ad && !!bd && ad.enumerable === true && bd.enumerable === true &&
        'value' in ad && 'value' in bd && compare(ad.value, bd.value);
    };
    leftAncestors.add(a);
    rightAncestors.add(b);
    try {
      if (aArray && bArray) {
        if (
          a.length !== b.length ||
          Object.keys(a).length !== a.length ||
          Object.keys(b).length !== b.length
        ) return false;
        for (let index = 0; index < a.length; index += 1) {
          if (!compareProperty(String(index))) return false;
        }
        return true;
      }
      const keys = Object.getOwnPropertyNames(a);
      return keys.length === Object.getOwnPropertyNames(b).length &&
        keys.every(compareProperty);
    } finally {
      leftAncestors.delete(a);
      rightAncestors.delete(b);
    }
  };
  try {
    return compare(left, right);
  } catch {
    return false;
  }
};

const createWebCryptoSha256Provider = (): WorkbenchPersistenceV3Sha256Provider => ({
  digest: async (data) => {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      throw new Error('Web Crypto SHA-256 is unavailable in this runtime.');
    }
    const digestInput = new Uint8Array(data.byteLength);
    digestInput.set(data);
    return subtle.digest('SHA-256', digestInput);
  },
});

const normalizeDigestBytes = (
  digest: ArrayBuffer | Uint8Array,
): Uint8Array => {
  const bytes = digest instanceof Uint8Array
    ? new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength)
    : new Uint8Array(digest);
  if (bytes.byteLength !== 32) {
    throw new Error(`SHA-256 provider returned ${bytes.byteLength} bytes; expected 32.`);
  }
  return bytes;
};

const digestBytesToHex = (bytes: Uint8Array): string => (
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
);

export const createWorkbenchPersistenceV3FingerprintProvider = (
  sha256Provider: WorkbenchPersistenceV3Sha256Provider =
    createWebCryptoSha256Provider(),
): WorkbenchPersistenceV3FingerprintProvider => {
  const fingerprintCanonicalJson = async (canonicalJson: string) => {
    const encoded = new TextEncoder().encode(canonicalJson);
    const digest = normalizeDigestBytes(await sha256Provider.digest(encoded));
    return `sha256:${digestBytesToHex(digest)}`;
  };

  return {
    canonicalize: canonicalizeWorkbenchPersistenceV3Json,
    fingerprintCanonicalJson,
    fingerprint: async (value) => (
      fingerprintCanonicalJson(canonicalizeWorkbenchPersistenceV3Json(value))
    ),
  };
};

export const WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER =
  createWorkbenchPersistenceV3FingerprintProvider();
