# Contributing to VRC Worlds Manager

Thank you for considering contributing to VRC Worlds Manager!  
We welcome all kinds of contributions, including bug reports, feature requests, translations, and code improvements.

## Language Usage

This project primarily uses English.
However, this does **not** mean that communication must be in English.

You are free to use your native language when creating Issues or PRs, and you are not required to respond in English to English comments.
This allows readers to use translation tools of their choice to understand your intent as accurately as possible.

## How to Contribute

1. **Fork the repository** and create your branch from `main` or the appropriate feature branch.
2. **Describe your changes** clearly in your pull request.
3. **Test your changes** before submitting.
4. For major changes, please open an issue first to discuss what you would like to change.

### Issues

Before modifying code, we recommend creating an [Issue](https://github.com/Raifa21/vrc-worlds-manager-v2/issues) to discuss the proposed changes.  
For unrelated questions or troubleshooting, please use [Discussions](https://github.com/Raifa21/vrc-worlds-manager-v2/discussions).

If you decide to work on an Issue, please assign yourself to avoid conflicts.
If you lack permission to self-assign, leave a comment to indicate your intent.

> [!WARNING]
> Before creating a new Issue, check for duplicates.  
> Also, even if an implementation approach is decided, do not close the Issue until the code is fully merged.

### Pull Requests

When creating a Pull Request, please follow these guidelines:
1. Ensure there is a related Issue or Security Advisory (create one if necessary).
2. Keep changes minimal to facilitate review.
3. (If possible) Use a prefix for branch names (e.g., `feat/`, `fix/`, `perf/`, `docs/`).
4. (If possible) Attach screenshots for UI changes.

If new language file entries are added, you do not need to fill out all translations yourself.  
After creating a PR, you can request translation contributions from others.

### Security Reports

If you discover a vulnerability or security-related bug, report it through [GitHub Security Advisories](https://github.com/Raifa21/VRC-Worlds-Manager-v2/security/advisories/new).  
If you plan to commit a fix yourself, follow these guidelines based on the severity:
- If revealing a PoC (Proof of Concept) before the fix is released is risky:
  - Create the fix in a [Private Fork](https://docs.github.com/en/code-security/security-advisories/working-with-repository-security-advisories/collaborating-in-a-temporary-private-fork-to-resolve-a-repository-security-vulnerability) and share it with contributors.
- If revealing a PoC before the fix is acceptable for minor vulnerabilities:
  - Follow the standard PR process.
- If uncertain about the risk level:
  - Do not disclose publicly and commit to a Private Fork instead.

### License

Your contributions will be published under the same license as the project.  
See the [LICENSE](LICENSE) file for details.

## Setting Up the Development Environment

Install the following dependencies:

- [Rust](https://www.rust-lang.org/tools/install)
- [Next.js](https://nextjs.org/docs/app/getting-started/installation)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

We recommend using [VSCode](https://code.visualstudio.com/), but you can use any editor you prefer.

### Installing Frontend Packages

Run the following command to install Node.js packages:

```
npm i
```

Rust dependencies will be installed automatically when running Tauri.

### Running in Dev Mode

Run `npm run tauri dev` to start the application.

Frontend code changes will trigger automatic updates.  
If updates do not appear, try refreshing with `Ctrl-R`.

Backend code changes will trigger an automatic restart.

> [!NOTE]
> Modifying backend code triggers a dev build on every save, which can slow development.  
> It is recommended to restart only when necessary.

## Code Formatting

Use the following commands to format the code:
```
npx prettier --write "src/**/*.{ts,tsx}"

(cd src-tauri && cargo fmt)  
```

---

Thank you for helping make VRC Worlds Manager better!