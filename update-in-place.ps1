# Updates this project folder from the demo-studio branch.
# Leaves local folders in place: node_modules, docs, Project, dist.
param([string]$Zip)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$dest = $PSScriptRoot
if (-not (Test-Path (Join-Path $dest 'package.json'))) {
  throw "package.json was not found. Put this script in the project folder and run it again."
}

$tmp = Join-Path $env:TEMP ("eko-update-" + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  $zipPath = Join-Path $tmp 'src.zip'
  if ($Zip) {
    Copy-Item -LiteralPath $Zip -Destination $zipPath
  } else {
    $url = 'https://codeload.github.com/Mohammedazif/Frag-digitaltwin-viewer/zip/refs/heads/demo-studio'
    Write-Host "Downloading demo-studio..."
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
  }
  Expand-Archive -LiteralPath $zipPath -DestinationPath (Join-Path $tmp 'unpack')
  $inner = Get-ChildItem (Join-Path $tmp 'unpack') -Directory | Select-Object -First 1
  if (-not $inner) { throw "The zip did not contain the project." }
  Write-Host "Replacing code in $dest"
  & robocopy $inner.FullName $dest /E /R:1 /W:1 /NFL /NDL /NJH /NJS /nc /ns /np /XD node_modules docs Project dist dist-ssr .git venv .venv
  if ($LASTEXITCODE -ge 8) { throw "Copy failed (robocopy $LASTEXITCODE)." }
} finally {
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host ""
Write-Host "Updated this folder from demo-studio."
Write-Host "docs, node_modules, and saved projects were left as they are."
Write-Host "Reload the viewer."
