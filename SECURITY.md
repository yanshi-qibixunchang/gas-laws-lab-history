# Security Policy

## Supported Code

Security fixes target the current `main` branch and the latest published desktop release. Older releases may be referenced for migration history but are not active update channels.

## Reporting A Vulnerability

Report vulnerabilities through the source repository's private GitHub Security Advisory workflow, or through an existing private team channel. Do not publish exploit details, credentials, personal data, or reproducible attack material in the public release repository's issues.

Include the affected version or commit, impact, reproduction conditions, and the smallest safe evidence needed to validate the issue. Do not include real user data.

## Repository And Release Boundary

The public release repository may contain only:

- User-facing README, changelog, security, and structured release-note files.
- A versioned Windows installer `.exe`.
- The matching `.exe.blockmap`.
- The matching `latest.yml` update manifest.

It must not contain application source, development branches, build inputs, local reports, secrets, personal information, or source-repository archives.

## Secret And Privacy Response

If a secret or participant identity is committed:

1. Keep or make the affected repository private immediately.
2. Revoke or rotate the credential before cleaning Git history.
3. Remove the data from the current tree, all pushed refs, tags, release assets, caches, and retained historical objects.
4. Re-audit commit identities and binary metadata before restoring any public visibility.

History rewriting and destructive cleanup require an explicit backup and coordinated force-push plan.
