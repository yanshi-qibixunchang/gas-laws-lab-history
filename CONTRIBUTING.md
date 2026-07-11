# Contributing

This repository is developed as a team collaboration project and its visibility may change during the collaboration lifecycle. Keep changes focused, reviewable, and free of participant identity information.

## Workflow

1. Start from the current `main` branch.
2. Use a focused branch such as `codex/<topic>` for changes.
3. Keep generated dependencies and outputs out of Git.
4. Run the quality gates before requesting review:

```powershell
npm.cmd run check
npm.cmd run build
```

5. Describe user-visible behavior, verification, and any remaining release work in the pull request.

## Privacy Gate

Before every push:

- Confirm `git config user.email` is a GitHub `noreply` address.
- Do not commit names, school affiliations, personal email addresses, phone numbers, IDs, precise locations, local usernames, or absolute user paths.
- Do not commit `.env` files, tokens, credentials, private keys, installers, caches, reports containing author metadata, or temporary captures.
- Treat Office/PDF properties, image EXIF, GLB extras, commit authors, branch history, and deleted blobs as possible disclosure surfaces.
- Keep third-party license notices and academic citations intact when attribution is required.

## Release Gate

Source changes are not automatically a desktop release. Do not bump a version, run the formal installer pipeline, create a tag, or upload release assets until a release version is explicitly approved.

The public release repository is restricted to user-facing documentation and the matching installer `.exe`, `.exe.blockmap`, and `latest.yml` assets. Never mirror this source tree into that repository.

## Private Repository Access

GitHub personal repositories grant collaborators write access. Teammates should use their own GitHub accounts and their own Codex/ChatGPT authorization. Do not share account passwords, session cookies, personal access tokens, SSH private keys, or recovery codes.
