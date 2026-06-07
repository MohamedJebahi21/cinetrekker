$branches = git for-each-ref --sort=committerdate refs/remotes/origin --format='%(refname:short)' | Where-Object { $_.StartsWith('origin/') -and $_ -ne 'origin/HEAD' -and $_ -ne 'origin/main' -and $_ -ne 'origin' }

foreach ($b in $branches) {
    Write-Host "Merging $b"
    git merge $b -m "Merge $b into consolidate-all" -X theirs --allow-unrelated-histories
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Conflict detected, auto-resolving for $b..."
        git add .
        git commit -m "Auto-resolve conflicts for $b" --no-edit
    }
}
