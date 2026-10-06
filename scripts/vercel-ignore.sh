#!/usr/bin/env bash
# Vercel "Ignored Build Step" (SIN-223): Exit 0 = Build überspringen, Exit 1 = bauen.
# Hobby-Limit schonen: keine Preview für reine Doku-Commits. Auch main (Production) baut bei reinen Doku-/CI-Commits nicht (SIN-251).
# Überholte Commits eines PRs bricht Vercel selbst ab (github.autoJobCancelation, siehe vercel.json).
set -u

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

echo "Code geändert: Build läuft."
exit 1
