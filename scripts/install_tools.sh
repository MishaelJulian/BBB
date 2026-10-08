#!/usr/bin/env bash
# Check (default) or install (--install) the system tools this project needs.
#   scripts/install_tools.sh            report what is missing
#   scripts/install_tools.sh --install  install what is missing (asks for sudo)
# Supports pacman (Arch/Manjaro), apt (Debian/Ubuntu) and brew (macOS).
set -euo pipefail

INSTALL=0; [[ "${1:-}" == "--install" ]] && INSTALL=1

if   command -v pacman >/dev/null; then PM=pacman
elif command -v apt-get >/dev/null; then PM=apt
elif command -v brew >/dev/null; then PM=brew
else echo "No supported package manager (pacman, apt, brew)."; exit 1; fi

# name | check command | pacman pkg | apt pkg | brew pkg | why
TOOLS=(
  "docker|docker --version|docker|docker.io|docker|backend + frontend containers"
  "docker compose|docker compose version|docker-compose|docker-compose-v2|docker-compose|runs both services (use 'docker compose', with a space)"
  "docker buildx|docker buildx version|docker-buildx|docker-buildx|docker-buildx|BuildKit builder; without it compose falls back to the deprecated classic builder"
  "git|git --version|git|git|git|version control"
  "gh|gh --version|github-cli|gh|gh|GitHub releases, PRs, code scanning"
  "uv|uv --version|uv|-|uv|runs the Python backend without a virtualenv"
  "node 20+|node -e 'process.exit(+process.versions.node.split(\".\")[0]>=20?0:1)'|nodejs|nodejs|node|Next.js 15 frontend"
  "npm|npm --version|npm|npm|-|frontend packages"
  "sqlite3|sqlite3 --version|sqlite|sqlite3|sqlite|inspect book_club_archivist.db"
  "ffmpeg|ffmpeg -version|ffmpeg|ffmpeg|ffmpeg|README hero frames from video"
  "tesseract (planned)|tesseract --version|tesseract tesseract-data-eng|tesseract-ocr|tesseract|OCR for scanned meetup sheets (roadmap)"
)

missing=()
for row in "${TOOLS[@]}"; do
  IFS='|' read -r name check pac apt brew why <<<"$row"
  if bash -c "$check" >/dev/null 2>&1; then
    printf '  ok       %-20s %s\n' "$name" "$why"
  else
    printf '  MISSING  %-20s %s\n' "$name" "$why"
    case $PM in pacman) pkg=$pac;; apt) pkg=$apt;; brew) pkg=$brew;; esac
    if [[ "$pkg" == "-" ]]; then
      echo "           no $PM package; see the tool's own install docs"
    else
      missing+=($pkg)
    fi
  fi
done

if (( ${#missing[@]} == 0 )); then echo "All tools present."; exit 0; fi
echo; echo "To install with $PM: ${missing[*]}"
(( INSTALL )) || { echo "Re-run with --install to install them."; exit 0; }

case $PM in
  pacman) sudo pacman -S --needed "${missing[@]}" ;;
  apt)    sudo apt-get update && sudo apt-get install -y "${missing[@]}" ;;
  brew)   brew install "${missing[@]}" ;;
esac
