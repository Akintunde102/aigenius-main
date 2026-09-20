# Launch Electron with a real HWND when the parent is Tilt's hidden console.
#
# spawn/`start`/CreateProcess/ShellExecute from Tilt inherit SW_HIDE.
# A Scheduled Task with an Interactive logon token runs on the user's desktop.
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [Parameter(Mandatory = $true)][string]$WorkDir,
  [string[]]$AppArgs = @('.')
)

$ErrorActionPreference = 'Stop'
$taskName = 'AIGeniusDesktopTiltLaunch'

function Quote-WinArg([string]$value) {
  if ($value -notmatch '[\s"]') { return $value }
  return '"' + ($value -replace '"', '\"') + '"'
}

function Test-EnvNameAllowed([string]$name) {
  return $name -match '^(AIGENIUS_|DEV_|ELECTRON_|NODE_|PATH$|PATHEXT$|SystemRoot$|windir$|USERPROFILE$|APPDATA$|LOCALAPPDATA$|TEMP$|TMP$|TMPDIR$|ComSpec$|USERNAME$|USERDOMAIN$|USERDOMAIN_ROAMINGPROFILE$|OS$|SystemDrive$|ProgramData$|ProgramFiles$|ProgramW6432$|PUBLIC$|HOME$|HOMEDRIVE$|HOMEPATH$|NUMBER_OF_PROCESSORS$|PROCESSOR_|SESSIONNAME$|CLIENTNAME$)'
}

function Write-EnvLaunchVbs([string]$vbsPath) {
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add('Set sh = CreateObject("WScript.Shell")')
  $lines.Add('sh.CurrentDirectory = "' + ($WorkDir -replace '"', '""') + '"')
  Get-ChildItem Env: | ForEach-Object {
    if (-not (Test-EnvNameAllowed $_.Name)) { return }
    if ($null -eq $_.Value) { return }
    if ($_.Value -match '[\r\n]') { return }
    if ($_.Value.Length -gt 800) { return }
    $k = $_.Name -replace '"', '""'
    $v = $_.Value -replace '"', '""'
    $lines.Add('sh.Environment("Process")("' + $k + '") = "' + $v + '"')
  }
  $runArgs = @($AppArgs | ForEach-Object { Quote-WinArg $_ }) -join ' '
  $run = '""' + ($Exe -replace '"', '""') + '"" ' + $runArgs
  $lines.Add('WScript.Quit sh.Run("' + $run + '", 1, True)')
  [IO.File]::WriteAllText($vbsPath, ($lines -join "`r`n"))
}

function Wait-ForElectron {
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    $proc = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
      Where-Object { $_.ExecutablePath -and ($_.ExecutablePath -ieq $Exe) -and (-not $_.CommandLine -or $_.CommandLine -notmatch '--type=') } |
      Select-Object -First 1
    if ($proc) { return $proc }
    Start-Sleep -Milliseconds 250
  }
  return $null
}

$vbsPath = Join-Path $WorkDir '.tilt-launch-electron.vbs'
Write-EnvLaunchVbs $vbsPath
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'

Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue |
  Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute $wscript -Argument "//nologo `"$vbsPath`"" -WorkingDirectory $WorkDir
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Host "[launch-electron] scheduled task $taskName started"

$electronProc = Wait-ForElectron
if (-not $electronProc) {
  Write-Error "Scheduled task did not start Electron"
  exit 1
}

Write-Host "[launch-electron] electron pid=$($electronProc.ProcessId)"
Wait-Process -Id $electronProc.ProcessId -ErrorAction SilentlyContinue
exit 0
