# Set git configuration
git config user.name "LukasSchmoelzl"
git config user.email "lukas@schmoelzl.de"

# Create orphan branch Release-0.4
git checkout --orphan Release-0.4

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit for Release-0.4"

# Add remote for BIMxAI repository
git remote add bimxai https://github.com/LukasSchmoelzl/BIMxAI.git

# Push the new branch
git push -u bimxai Release-0.4

Write-Host "Successfully created and pushed Release-0.4 branch to BIMxAI repository"
