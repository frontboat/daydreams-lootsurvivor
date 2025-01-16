# Git Cheat Sheet for Fork Workflow

## Initial Setup
```bash
# Add upstream remote (original repo)
git remote add upstream https://github.com/daydreamsai/daydreams.git

# Verify remotes
git remote -v
```

## Working with Upstream Branches
```bash
# Fetch all branches from upstream
git fetch upstream

# List all remote branches
git branch -r

# Checkout an upstream branch
git checkout upstream/feat/input-output   # This puts you in detached HEAD state

# Create local branch tracking upstream
git switch -c feat/input-output upstream/feat/input-output
```

## Creating Working Branches
```bash
# Create new branch from current branch
git checkout -b feat/input-output-lootsurvivor

# Push new branch to your fork and set upstream
git push --set-upstream origin feat/input-output-lootsurvivor
# or shorter:
git push -u origin feat/input-output-lootsurvivor
```

## Keeping in Sync with Upstream
```bash
# Update your tracking branch
git checkout feat/input-output
git pull upstream feat/input-output

# Update your working branch
git checkout feat/input-output-lootsurvivor
git merge feat/input-output
```

## Basic Git Commands
```bash
# Stage changes
git add .

# Commit changes
git commit -m "your message"

# Push changes
git push

# Check branch status
git status

# Switch branches
git checkout branch-name
```

## Workflow Summary
1. Keep clean copies of upstream branches:
   - `feat/input-output` tracks `upstream/feat/input-output`
   
2. Create working branches for your changes:
   - `feat/input-output-lootsurvivor` for your implementation

3. Regular sync process:
   ```bash
   git checkout feat/input-output
   git pull upstream feat/input-output
   git checkout feat/input-output-lootsurvivor
   git merge feat/input-output
   ```

4. Push your changes:
   ```bash
   git add .
   git commit -m "your changes"
   git push origin feat/input-output-lootsurvivor
   ``` 