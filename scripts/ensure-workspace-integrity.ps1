$ErrorActionPreference = 'Stop'

$protectedPublicFiles = @(
  'public/apple-touch-icon.png',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png',
  'public/favicon.ico',
  'public/og-image.png',
  'public/robots.txt'
)

function Try-RunGit {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Args
  )

  try {
    $output = & git @Args 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }

    return ($output | Out-String).Trim()
  } catch {
    return $null
  }
}

function RunGit {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Args
  )

  $output = & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE."
  }

  return ($output | Out-String).Trim()
}

function Ensure-HeadRef {
  $headCommit = Try-RunGit @('rev-parse', '--verify', 'HEAD')
  if ($headCommit) {
    return $false
  }

  $branchRef = Try-RunGit @('symbolic-ref', '-q', 'HEAD')
  $remoteMain = Try-RunGit @('rev-parse', '--verify', 'origin/main')

  if (-not $branchRef -or -not $remoteMain) {
    throw 'Unable to repair git HEAD automatically.'
  }

  RunGit @('update-ref', $branchRef, $remoteMain) | Out-Null
  return $true
}

function Restore-TrackedPublicFiles {
  $missing = @($protectedPublicFiles | Where-Object { -not (Test-Path $_) })

  if ($missing.Count -eq 0) {
    return @()
  }

  $checkoutArgs = @('checkout', '--') + $missing
  RunGit $checkoutArgs | Out-Null
  return $missing
}

$repairedHead = Ensure-HeadRef
$restoredFiles = Restore-TrackedPublicFiles

if ($repairedHead) {
  Write-Host 'Repaired local git branch reference from origin/main.'
}

if ($restoredFiles.Count -gt 0) {
  Write-Host "Restored $($restoredFiles.Count) missing tracked public file(s)."
  $restoredFiles | ForEach-Object { Write-Host "- $_" }
}

if (-not $repairedHead -and $restoredFiles.Count -eq 0) {
  Write-Host 'Workspace integrity check passed.'
}
