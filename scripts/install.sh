#!/usr/bin/env bash
# findings-visualizer install script (bash)
# Usage:
#   ./scripts/install.sh                    # install to default Devin skill dir
#   ./scripts/install.sh /custom/path       # install to custom dir
#   ./scripts/install.sh --claude           # install to .devin/skills/ in cwd
#   ./scripts/install.sh --force            # overwrite existing

set -e

SKILL_NAME="findings-visualizer"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"

FORCE=false
CLAUDE=false
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --claude) CLAUDE=true ;;
    --help|-h)
      echo ""
      echo "  findings-visualizer installer"
      echo ""
      echo "  Usage:"
      echo "    ./scripts/install.sh                Install to ~/.config/devin/skills/"
      echo "    ./scripts/install.sh /custom/path   Install to custom directory"
      echo "    ./scripts/install.sh --claude       Install to ./.devin/skills/ (project-local)"
      echo "    ./scripts/install.sh --force        Overwrite existing install"
      echo ""
      exit 0
      ;;
    *) TARGET="$arg" ;;
  esac
done

# Determine target
if [ -z "$TARGET" ]; then
  if [ "$CLAUDE" = true ]; then
    TARGET="$(pwd)/.devin/skills/$SKILL_NAME"
  else
    TARGET="$HOME/.config/devin/skills/$SKILL_NAME"
  fi
fi

echo ""
echo "  \033[36mfindings-visualizer installer\033[0m"
echo "  \033[90m-----------------------------\033[0m"
echo "  Source:  $SOURCE_DIR"
echo "  Target:  $TARGET"
echo ""

# Validate source
if [ ! -f "$SOURCE_DIR/SKILL.md" ]; then
  echo "  \033[31mERROR: SKILL.md not found in $SOURCE_DIR\033[0m"
  echo "  \033[33mMake sure you're running this from the cloned repo.\033[0m"
  exit 1
fi

# Check existing
if [ -d "$TARGET" ] && [ "$FORCE" = false ]; then
  echo "  \033[33mTarget already exists: $TARGET\033[0m"
  echo "  \033[90mUse --force to overwrite.\033[0m"
  exit 1
fi

# Remove existing if force
if [ -d "$TARGET" ]; then
  echo "  \033[90mRemoving existing install...\033[0m"
  rm -rf "$TARGET"
fi

# Create dirs
mkdir -p "$TARGET/assets/components"

# Copy files
copy_file() {
  local src="$SOURCE_DIR/$1"
  local dst="$TARGET/$1"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "  \033[90m  $1\033[0m"
  else
    echo "  \033[33m  WARN: missing $1\033[0m"
  fi
}

echo "  \033[90mCopying files...\033[0m"
copy_file "SKILL.md"
copy_file "plugin.json"
copy_file "marketplace.json"
copy_file "assets/shell.html"
copy_file "assets/logo/logo-nobg.png"
copy_file "assets/components/verdict-banner.html"
copy_file "assets/components/summary-cards.html"
copy_file "assets/components/stats-bar.html"
copy_file "assets/components/severity-chart.html"
copy_file "assets/components/category-chart.html"
copy_file "assets/components/effort-chart.html"
copy_file "assets/components/heatmap-chart.html"
copy_file "assets/components/filter-sidebar.html"
copy_file "assets/components/search-bar.html"
copy_file "assets/components/finding-controls.html"
copy_file "assets/components/findings-list.html"
copy_file "assets/components/strengths-list.html"
copy_file "assets/components/theme-toggle.html"
copy_file "assets/components/export-bar.html"
copy_file "assets/components/status-cards.html"
copy_file "assets/components/progress-bar.html"
copy_file "assets/components/feature-list.html"
copy_file "assets/components/checklist-progress.html"
copy_file "assets/components/checklist-list.html"
copy_file "assets/components/comparison-table.html"

# Verify
echo ""
if [ -f "$TARGET/SKILL.md" ]; then
  echo "  \033[32mVerification: SKILL.md present\033[0m"
else
  echo "  \033[31mVerification: FAILED\033[0m"
  exit 1
fi

COMP_COUNT=$(find "$TARGET/assets/components" -name "*.html" 2>/dev/null | wc -l)
echo "  \033[32mVerification: $COMP_COUNT components found\033[0m"

echo ""
echo "  \033[36mDone! The skill is ready to use.\033[0m"
echo "  \033[90mRestart your Devin/Claude session to pick up the new skill.\033[0m"
echo ""
