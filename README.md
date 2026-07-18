# Gas Laws Lab

[简体中文](./README.zh-CN.md)

Gas Laws Lab is a Windows engineering workbench for hard-sphere molecular dynamics, ideal-gas relation studies, and the adiabatic-expansion experiment for measuring the heat-capacity ratio of air.

The latest published desktop release is `v5.1.2`. The `main` branch may contain reviewed work completed after that tag; source changes on `main` are not a new desktop release until the version is explicitly bumped and a complete update package is published.

- Public downloads and update metadata: [hard-sphere-lab-release](https://github.com/yanshi-qibixunchang/hard-sphere-lab-release)
- Security and disclosure policy: [SECURITY.md](./SECURITY.md)
- Contribution and privacy checks: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Product Scope

- Standard hard-sphere simulation with a live 3D preview, realtime charts, and result tabs.
- Ideal-gas `P-T`, `P-V`, and `P-N` studies with sampling, verification, and history views.
- Air heat-capacity-ratio experiment with Demo, Guide, and Free modes.
- Local desktop export for PDF reports, PDF/PNG figures, CSV data, and metadata.
- Simplified Chinese, Traditional Chinese, and English interface text.

## Current Source Highlights

- The workbench UI is split into focused command, settings, updater, parameter, persistence, and experiment modules.
- Heat-capacity runtime state is modeled separately from standard and ideal-gas files.
- `v5.1.2` strictly restores affected 4.2.3 workspaces, adds update recovery to the read-only persistence failure page, hardens WebGL context-loss recovery, and introduces the localized Gas Laws Lab brand without changing the existing user-data or updater identity.
- Desktop publishing targets only the public release repository. The source repository is not an update channel.

## Repository Layout

- `src/app/`: React application entrypoint.
- `src/components/`: shared visual components.
- `src/features/`: workbench, ideal-gas, and heat-capacity UI and orchestration.
- `src/domain/`: simulation and experiment calculation models.
- `src/shared/`: shared types and utilities.
- `src/i18n/`: application translation tables.
- `tests/`: hard-sphere, ideal-gas, heat-capacity, workbench, and exporter regression tests.
- `electron/`: Electron main process, preload bridge, and update integration.
- `tools/exporter/`: Python exporter source.
- `scripts/` and `build/`: build, validation, packaging, and installer helpers.
- `public/`: runtime models, fonts, icons, mockups, and generated legal notices.
- `resources/`: desktop icons and generated exporter resources.
- `docs/`: release notes, theory, instrument-modeling references, and internal design records.

Generated dependencies and outputs such as `node_modules/`, `dist/`, `release/`, `output/`, and `tmp/` are intentionally ignored.

## Repository Access And Codex Collaboration

While the source repository is public, teammates can open its GitHub URL in Codex or clone it locally without a repository invitation.

If the repository is later returned to private visibility, teammates can continue through explicit GitHub access:

1. Invite each teammate's GitHub account as a collaborator on the private repository.
2. The teammate accepts the GitHub invitation.
3. The teammate either clones the repository and opens the local folder in Codex, or authorizes the repository when connecting GitHub to Codex/ChatGPT.

A personal-account private repository gives collaborators write access. If the team needs read-only roles, transfer the source repository to a GitHub organization and grant an organization `Read` role instead.

## Development

Install the locked dependency set:

```powershell
npm.cmd ci
```

Run the fixed local preview:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Preview URL: `http://127.0.0.1:5174/`

Run the normal quality gates:

```powershell
npm.cmd run check
npm.cmd run build
```

Run the Electron application locally:

```powershell
npm.cmd run desktop:dev
```

The browser preview covers the simulator and workbench UI. Local report and figure export requires the Electron bridge and exporter environment.

## Desktop Release Boundary

Do not build or publish a new installer merely because `main` changed. A desktop release starts only after a version is chosen and `package.json` plus `package-lock.json` are updated.

For an approved release, the public update repository must receive exactly the matching update assets from `release/`:

- `heat-capacity-lab-setup-<version>.exe`
- `heat-capacity-lab-setup-<version>.exe.blockmap`
- `latest.yml`

The public update repository may also contain user-facing README, changelog, security, and structured release-note files. It must not contain this repository's source tree, development branches, build inputs, local reports, credentials, or personal information.

## Privacy And Repository Hygiene

- Use a GitHub-provided `noreply` address for commits.
- Do not commit credentials, `.env` files, personal contact details, participant names, school affiliations, absolute user paths, or document/image author metadata.
- Before any repository becomes public, audit the current tree, every pushed branch and tag, commit identities, deleted historical blobs, release assets, and binary metadata.
- Third-party author names required by licenses or academic citations are source attribution, not project-member identity; keep those records separate from participant information.

## Instrument Model Contract

The air heat-capacity-ratio apparatus model is a state-machine-driven visualization and interaction carrier. It is not the source of truth for `P0`, `P1`, `P2`, `U_p`, `U_T`, or `gamma`. Its structure and workflow draw on several teaching instruments, with FD-NCD-C serving as one of the principal references; this project is not an official simulation or digital replica of that model.

The Blender integration contract is documented at:

```text
docs/instrument-modeling/reference/Blender模型接入规则-v4.0.1.md
```

## Licensing

No open-source license is declared for the project source. Access to the repository does not grant redistribution rights. Third-party components and reference materials retain their own terms; see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
