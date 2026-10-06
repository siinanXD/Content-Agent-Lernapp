#!/usr/bin/env bash
# Vercel "Ignored Build Step" (SIN-223): Exit 0 = Build überspringen, Exit 1 = bauen.
# Hobby-Limit schonen (SIN-266):
#  - main (Production) baut nie von selbst. Den Production-Deploy löst der Status-Wächter über den Deploy Hook aus
#    (höchstens 1× pro Stunde, nur bei neuem App-Code, siehe scripts/autonomy/deploy.mjs).
#  - Previews nur für Frontend-PRs (UI-Dateien geändert) oder PRs mit Label `preview`; reine Doku/CI/Tests nie.
# Überholte Commits eines PRs bricht Vercel selbst ab (github.autoJobCancelation, siehe vercel.json).
set -u

BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

if [ "$BRANCH" = "main" ]; then
  echo "main: Production wird gebündelt über den Deploy Hook ausgelöst, Build wird übersprungen."
  exit 0
fi

# Ohne Vorgänger-Commit lässt sich nichts vergleichen: lieber bauen.
if ! git rev-parse --verify -q HEAD^ >/dev/null; then
  echo "Kein HEAD^: Build läuft."
  exit 1
fi

# Nur Doku geändert (docs/, *.md, .github/, e2e/, scripts/autonomy/, Tests ohne Laufzeit-Wirkung)?
if git diff --quiet HEAD^ HEAD -- . \
  ':(exclude)docs' ':(exclude)*.md' ':(exclude).github' ':(exclude)e2e' ':(exclude)scripts/autonomy' ':(exclude)scripts/decisions-index.mjs' \
  ':(exclude,glob)**/*.test.*' ':(exclude)playwright.config.ts'; then
  echo "Nur Doku/CI geändert: Build wird übersprungen."
  exit 0
fi

# Frontend-Spur = UI-Dateien (Seiten, Komponenten, Styles, öffentliche Dateien) geändert.
if ! git diff --quiet HEAD^ HEAD -- src/app src/components public ':(glob)**/*.css'; then
  echo "UI geändert: Preview läuft."
  exit 1
fi

# Sonst nur mit Label `preview` (öffentliche GitHub-API; ohne Antwort: keine Preview).
PR="${VERCEL_GIT_PULL_REQUEST_ID:-}"
if [ -n "$PR" ] && [ -n "${VERCEL_GIT_REPO_OWNER:-}" ] && [ -n "${VERCEL_GIT_REPO_SLUG:-}" ]; then
  if curl -fsS --max-time 10 "https://api.github.com/repos/${VERCEL_GIT_REPO_OWNER}/${VERCEL_GIT_REPO_SLUG}/pulls/${PR}" 2>/dev/null | grep -q '"name": *"preview"'; then
    echo "Label preview: Preview läuft."
    exit 1
  fi
fi

echo "Kein Frontend-PR und kein Label preview: Preview wird übersprungen."
exit 0
