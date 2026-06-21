#!/usr/bin/env bash
# Ship the Horror Timeline Monster quiz to GitHub.
# Vercel auto-deploys main -> https://proofofreal.app/social/horrorvillainquiz
#
# Usage:
#   ./ship-quiz.sh                       # default commit message
#   ./ship-quiz.sh "your message here"   # custom commit message
#
# Only stages the quiz files, so it never touches your other in-progress work.
set -e
cd "$(dirname "$0")"

MSG="${1:-Update Horror Timeline quiz}"

git add app/social/horrorvillainquiz \
        public/social/horrorvillainquiz \
        ship-quiz.sh

if git diff --cached --quiet; then
  echo "Nothing to ship — no quiz changes staged."
  exit 0
fi

git commit -m "$MSG"
git push origin main

echo ""
echo "Shipped. Vercel will redeploy in ~1 min:"
echo "   https://proofofreal.app/social/horrorvillainquiz"
