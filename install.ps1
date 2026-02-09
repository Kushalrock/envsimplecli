$repo = "Kushalrock/envsimple"
$url = "https://github.com/$repo/releases/latest/download/envsimple-windows-x64.exe"

$out = "$env:USERPROFILE\envsimple.exe"

Invoke-WebRequest $url -OutFile $out

$path = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($path -notlike "*$env:USERPROFILE*") {
  [Environment]::SetEnvironmentVariable("PATH", "$path;$env:USERPROFILE", "User")
}

# Refresh PATH in current session
$env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")

Write-Host "Installed EnvSimple CLI"
Write-Host "Run 'envsimple --help' to get started"
