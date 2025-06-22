#!/bin/bash

# 🚀 Galileosky Parser GitHub Setup Script
# This script helps you set up your GitHub repository

set -e

echo "🛰️  Galileosky Parser GitHub Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_status "Git repository initialized"
fi

# Check if remote origin exists
if git remote get-url origin &> /dev/null; then
    print_warning "Remote origin already exists:"
    git remote get-url origin
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your GitHub username: " github_username
        git remote set-url origin "https://github.com/$github_username/galileosky-parser.git"
        print_status "Remote origin updated"
    fi
else
    read -p "Enter your GitHub username: " github_username
    git remote add origin "https://github.com/$github_username/galileosky-parser.git"
    print_status "Remote origin added"
fi

# Update README.md with correct username
if [ ! -z "$github_username" ]; then
    print_info "Updating README.md with your GitHub username..."
    sed -i "s/YOUR_USERNAME/$github_username/g" README.md
    print_status "README.md updated"
fi

# Update scripts with correct repository URL
if [ ! -z "$github_username" ]; then
    print_info "Updating script files with correct repository URL..."
    if [ -f "termux-start.sh" ]; then
        sed -i "s|https://github.com/your-repo/galileosky-parser.git|https://github.com/$github_username/galileosky-parser.git|g" termux-start.sh
    fi
    if [ -f "termux-backend-only.sh" ]; then
        sed -i "s|https://github.com/your-repo/galileosky-parser.git|https://github.com/$github_username/galileosky-parser.git|g" termux-backend-only.sh
    fi
    print_status "Script files updated"
fi

# Add all files to git
print_info "Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    print_warning "No changes to commit"
else
    read -p "Enter commit message (or press Enter for default): " commit_message
    if [ -z "$commit_message" ]; then
        commit_message="Initial commit: Galileosky Parser project"
    fi
    
    git commit -m "$commit_message"
    print_status "Files committed"
fi

# Ask if user wants to push to GitHub
read -p "Do you want to push to GitHub now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Pushing to GitHub..."
    git branch -M main
    git push -u origin main
    print_status "Successfully pushed to GitHub!"
    
    print_info "Your repository URL:"
    echo "https://github.com/$github_username/galileosky-parser"
else
    print_info "To push later, run:"
    echo "git push -u origin main"
fi

echo
echo "🎉 Setup complete!"
echo
echo "Next steps:"
echo "1. Go to https://github.com/$github_username/galileosky-parser"
echo "2. Add repository description and topics"
echo "3. Enable GitHub Pages if desired"
echo "4. Share your repository!"
echo
echo "📚 Check GITHUB_SETUP.md for detailed instructions" 