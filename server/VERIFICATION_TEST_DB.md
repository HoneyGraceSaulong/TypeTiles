# Isolated manual email-verification database

Database: `server/data/typetiles-verification-test.db`. Existing `server/.gitignore` excludes the entire data directory, including SQLite WAL/SHM files. No accounts or records are copied from `typetiles.db`.

From the workspace root, stop the normal backend with Ctrl+C before running:

```powershell
npm.cmd --prefix server run dev:verification-test
```

The launcher loads existing backend `.env`, then explicitly sets an absolute `DATABASE_PATH` for this process. It confirms the file is regular and not linked, checks that the configured port is available, calls the existing `initializeDatabase()`, and confirms SQLite's actual main filename before importing the existing backend entry point. The backend reuses this checked connection. Resend/secrets and authentication rules are unchanged. It never edits `.env` or the parent terminal's environment. A conflicting backend port causes refusal.

Stop test mode with Ctrl+C. Return to normal mode using:

```powershell
npm.cmd --prefix server run dev
```

Normal startup retains its existing `.env`/`DATABASE_PATH` configuration. If you previously set a terminal-level DATABASE_PATH override yourself, remove that override before normal startup. The test launcher does not create one.

Initial setup (already performed for this workspace):

```powershell
npm.cmd --prefix server run db:verification-test:init
```

Initialization exclusively creates a new file and uses the real backend schema initializer. It refuses any existing file and never deletes/resets it. Do not rerun it to clear accounts. The test DB persists after testing; once a test email is registered, duplicate-email checks continue to apply in this database.

The dev test script runs directly through tsx without watch mode; restart it manually after backend edits. Use the usual frontend/server ports for the manual flow. A startup validation was performed separately on port 3011 because the configured port was occupied; that validation instance was stopped. No account registration or email request is part of startup/setup.

The normal database and its WAL/SHM files were checked by SHA-256 before and after setup/startup validation. They remained unchanged. All 11 test application tables were confirmed empty, including users, gameplay, verification, password reset, and quota storage.
