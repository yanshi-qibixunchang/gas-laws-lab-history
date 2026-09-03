# Legacy persistence compatibility boundary

This directory is the only V3 persistence area allowed to decode pre-V3
workspace and file-envelope schemas.

- `legacySupportMatrix.ts` is the machine-readable list of recognized schema
  families and supported versions.
- `workspaceCompatibilityDecoder.ts` is the schema-first migration entrypoint.
- `legacyV2Adapter.ts` contains the frozen legacy parsing and projection rules.
- `legacyV3ProjectionAdapter.ts` contains the explicit upgrade hook for early
  V3 heat-capacity projections that predate experiment-group authority.

Migration baseline 2 keeps the same supported legacy schema families while
canonicalizing heat-capacity Ideal sessions to the selectable gas profile and
accepting the earlier Ideal sensor profile during restore.

Ordinary V3 production save and restore must import `workspaceCodec.ts`
directly and must not import this directory. Unknown data and future versions
remain preserved or quarantined; they must never be forced through a legacy
migration.
