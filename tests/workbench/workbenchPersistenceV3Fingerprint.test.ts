import assert from 'node:assert/strict';
import {
  WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER,
  WorkbenchPersistenceV3CanonicalizationError,
  canonicalizeWorkbenchPersistenceV3Json,
  createWorkbenchPersistenceV3FingerprintProvider,
} from '../../src/features/workbench/persistenceV3/fingerprint.ts';

assert.equal(
  canonicalizeWorkbenchPersistenceV3Json({
    z: 1,
    a: 'first',
    nested: { value: true, empty: null },
  }),
  '{"a":"first","nested":{"empty":null,"value":true},"z":1}',
  'object keys must be sorted recursively',
);
assert.equal(
  canonicalizeWorkbenchPersistenceV3Json(['second', 'first', { b: 2, a: 1 }]),
  '["second","first",{"a":1,"b":2}]',
  'array order must be preserved while nested object keys are sorted',
);
assert.equal(canonicalizeWorkbenchPersistenceV3Json(-0), '0');

const nullPrototypeRecord = Object.create(null) as Record<string, unknown>;
nullPrototypeRecord.second = 2;
nullPrototypeRecord.first = 1;
assert.equal(
  canonicalizeWorkbenchPersistenceV3Json(nullPrototypeRecord),
  '{"first":1,"second":2}',
  'null-prototype data records remain valid JSON objects',
);

const canonicalLeft = canonicalizeWorkbenchPersistenceV3Json({ b: 2, a: 1 });
const canonicalRight = canonicalizeWorkbenchPersistenceV3Json({ a: 1, b: 2 });
assert.equal(canonicalLeft, canonicalRight);

const sha256OfAbc = await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER
  .fingerprintCanonicalJson('abc');
assert.equal(
  sha256OfAbc,
  'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
);
assert.equal(
  await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint({ b: 2, a: 1 }),
  await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint({ a: 1, b: 2 }),
  'key insertion order must not affect a semantic fingerprint',
);
assert.notEqual(
  await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint([1, 2]),
  await WORKBENCH_PERSISTENCE_V3_FINGERPRINT_PROVIDER.fingerprint([2, 1]),
  'array order must affect a semantic fingerprint',
);

let injectedDigestInput = '';
const injectedProvider = createWorkbenchPersistenceV3FingerprintProvider({
  digest: async (data) => {
    injectedDigestInput = new TextDecoder().decode(data);
    return Uint8Array.from({ length: 32 }, (_, index) => index);
  },
});
assert.equal(
  await injectedProvider.fingerprint({ b: 2, a: 1 }),
  `sha256:${Array.from(
    { length: 32 },
    (_, index) => index.toString(16).padStart(2, '0'),
  ).join('')}`,
);
assert.equal(injectedDigestInput, '{"a":1,"b":2}');

await assert.rejects(
  createWorkbenchPersistenceV3FingerprintProvider({
    digest: async () => new Uint8Array(31),
  }).fingerprint(null),
  /returned 31 bytes; expected 32/,
);

const expectCanonicalizationFailure = (
  value: unknown,
  expectedPath: string,
  expectedCode: WorkbenchPersistenceV3CanonicalizationError['code'],
) => {
  assert.throws(
    () => canonicalizeWorkbenchPersistenceV3Json(value),
    (error: unknown) => (
      error instanceof WorkbenchPersistenceV3CanonicalizationError &&
      error.path === expectedPath &&
      error.code === expectedCode &&
      error.message.includes(expectedPath)
    ),
  );
};

expectCanonicalizationFailure(undefined, '$', 'unsupported-type');
expectCanonicalizationFailure({ value: undefined }, '$.value', 'unsupported-type');
expectCanonicalizationFailure({ value: Number.NaN }, '$.value', 'non-finite-number');
expectCanonicalizationFailure({ value: Number.POSITIVE_INFINITY }, '$.value', 'non-finite-number');
expectCanonicalizationFailure({ value: 1n }, '$.value', 'unsupported-type');
expectCanonicalizationFailure({ value: () => undefined }, '$.value', 'unsupported-type');

const sparseArray = new Array(3);
sparseArray[0] = 'first';
sparseArray[2] = 'third';
expectCanonicalizationFailure(sparseArray, '$[1]', 'sparse-array');

const cyclic: Record<string, unknown> = {};
cyclic.self = cyclic;
expectCanonicalizationFailure(cyclic, '$.self', 'cyclic-reference');

expectCanonicalizationFailure({ when: new Date(0) }, '$.when', 'unsupported-object');
expectCanonicalizationFailure({ map: new Map([['key', 1]]) }, '$.map', 'unsupported-object');
expectCanonicalizationFailure({ set: new Set([1]) }, '$.set', 'unsupported-object');
expectCanonicalizationFailure(
  { bytes: new Uint8Array([1, 2, 3]) },
  '$.bytes',
  'unsupported-object',
);
expectCanonicalizationFailure(
  { buffer: new ArrayBuffer(4) },
  '$.buffer',
  'unsupported-object',
);

class CustomPersistenceValue {
  value = 1;
}
expectCanonicalizationFailure(
  { custom: new CustomPersistenceValue() },
  '$.custom',
  'unsupported-object',
);

const arrayWithExtraProperty = [1] as number[] & { label?: string };
arrayWithExtraProperty.label = 'unsupported';
expectCanonicalizationFailure(
  arrayWithExtraProperty,
  '$.label',
  'unsupported-property',
);

const objectWithGetter = Object.defineProperty({}, 'answer', {
  enumerable: true,
  get: () => 42,
});
expectCanonicalizationFailure(
  objectWithGetter,
  '$.answer',
  'unsupported-property',
);

const objectWithSymbol = { value: 1 };
Object.defineProperty(objectWithSymbol, Symbol('hidden'), {
  enumerable: true,
  value: 2,
});
expectCanonicalizationFailure(
  objectWithSymbol,
  '$',
  'unsupported-property',
);

expectCanonicalizationFailure(
  { 'not-an-identifier': undefined },
  '$["not-an-identifier"]',
  'unsupported-type',
);

console.log('workbenchPersistenceV3Fingerprint tests passed');
