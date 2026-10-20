$ErrorActionPreference = 'Stop'
$runnerRoot = $PSScriptRoot
$pistonRepo = Join-Path $runnerRoot '.tools/Piston'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker Desktop is required. Install and start Docker Desktop, then rerun this script.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker is not responding. Start Docker Desktop, then rerun this script.'
}

docker compose -f (Join-Path $runnerRoot 'docker-compose.yml') up -d
if ($LASTEXITCODE -ne 0) { throw 'Could not start the Piston Docker runner.' }

$apiReady = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:2000/api/v2/runtimes' -TimeoutSec 3 | Out-Null
    $apiReady = $true
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
if (-not $apiReady) { throw 'Piston did not become ready. Check Docker Desktop and the viva-code-runner container logs.' }

if (-not (Test-Path (Join-Path $pistonRepo 'cli/index.js'))) {
  New-Item -ItemType Directory -Force -Path (Split-Path $pistonRepo) | Out-Null
  git clone --depth 1 https://github.com/engineer-man/piston.git $pistonRepo
  if ($LASTEXITCODE -ne 0) { throw 'Could not download the Piston runtime manager.' }
}

npm --prefix (Join-Path $pistonRepo 'cli') install
if ($LASTEXITCODE -ne 0) { throw 'Could not install the Piston runtime manager dependencies.' }

$cli = Join-Path $pistonRepo 'cli/index.js'
foreach ($runtime in @('python', 'gcc', 'sqlite3', 'java')) {
  Write-Host "Installing Piston runtime: $runtime"
  node $cli -u http://127.0.0.1:2000 ppman install $runtime
  if ($LASTEXITCODE -ne 0) { throw "Could not install Piston runtime: $runtime" }
}

$installedRuntimes = Invoke-RestMethod -Uri 'http://127.0.0.1:2000/api/v2/runtimes' -TimeoutSec 10
foreach ($runtime in @('python', 'c++', 'sqlite3', 'java')) {
  if ($runtime -notin $installedRuntimes.language) {
    throw "Piston did not register the required runtime: $runtime"
  }
}

Write-Host 'VIVA code runner is ready at http://127.0.0.1:2000.'
