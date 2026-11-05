# taetaefarm 윈도우 개발 환경 설치 스크립트
# 실행: PowerShell에서 프로젝트 폴더로 이동 후
#   powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
# (방화벽 규칙까지 추가하려면 "관리자 권한"으로 실행)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path','User')
}

# ── 1. Node.js (20.19 이상 필요, 22 LTS 권장) ──
Step '1. Node.js 확인'
$needNode = $true
if (Get-Command node -ErrorAction SilentlyContinue) {
  $v = (node -v).TrimStart('v')
  $ver = [version]$v
  if ($ver -ge [version]'22.12.0' -or ($ver.Major -eq 20 -and $ver -ge [version]'20.19.0')) {
    Ok "Node.js v$v 설치되어 있음"; $needNode = $false
  } else { Warn "Node.js v$v 는 Vite 8 요구사항(20.19+ / 22.12+)보다 낮습니다. LTS로 업그레이드합니다." }
} else { Warn 'Node.js가 없습니다. 설치합니다.' }

if ($needNode) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'winget이 없습니다. https://nodejs.org 에서 LTS 버전을 직접 설치한 뒤 다시 실행하세요.'
  }
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 설치 후 PATH를 찾지 못했습니다. PowerShell 창을 새로 열고 다시 실행하세요.'
  }
  Ok "Node.js $(node -v) 설치 완료"
}
Ok "npm $(npm -v)"

# ── 2. git 사용자 정보 ──
Step '2. git 사용자 정보 확인'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
  Refresh-Path
}
$gName  = git config --global user.name
$gEmail = git config --global user.email
if (-not $gName)  { $gName  = Read-Host '  git user.name 입력';  git config --global user.name  $gName }
if (-not $gEmail) { $gEmail = Read-Host '  git user.email 입력'; git config --global user.email $gEmail }
Ok "user.name=$gName / user.email=$gEmail"

# ── 3. 의존성 설치 (루트 + server) ──
Step '3. npm 패키지 설치 (윈도우용으로 새로 설치)'
npm install
if ($LASTEXITCODE -ne 0) { throw '루트 npm install 실패' }
Ok '루트 패키지 설치 완료'
npm install --prefix server
if ($LASTEXITCODE -ne 0) { throw 'server npm install 실패' }
Ok 'server 패키지 설치 완료'

# ── 4. 환경변수 파일 ──
Step '4. .env 파일 확인'
$envFile = Join-Path $PSScriptRoot 'server\.env'
if (Test-Path $envFile) { Ok 'server\.env 이미 있음 (변경하지 않음)' }
else {
  Copy-Item (Join-Path $PSScriptRoot 'server\.env.example') $envFile
  Warn 'server\.env.example 을 복사해 server\.env 를 만들었습니다. 값을 채워 넣어야 서버가 시작됩니다.'
}

# ── 5. 방화벽 (다른 기기에서 접속용) ──
Step '5. 방화벽 포트 허용 (5173, 8080)'
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  foreach ($p in 5173, 8080) {
    $name = "taetaefarm-dev-$p"
    if (Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue) { Ok "$name 규칙 이미 있음" }
    else {
      New-NetFirewallRule -DisplayName $name -Direction Inbound -Protocol TCP -LocalPort $p -Action Allow -Profile Private | Out-Null
      Ok "$name 규칙 추가 (개인 네트워크)"
    }
  }
} else {
  Warn '관리자 권한이 아니어서 건너뜁니다. 휴대폰 등에서 접속이 필요하면 관리자 PowerShell로 다시 실행하세요.'
}

Step '완료'
Write-Host '  개발 서버 실행:  npm run dev' -ForegroundColor Green
Write-Host '  화면 http://localhost:5173  /  API http://localhost:8080' -ForegroundColor Green
