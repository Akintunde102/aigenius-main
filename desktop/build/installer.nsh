; Work around electron-builder NSIS update hangs (locked files / process checks).
; See: https://github.com/electron-userland/electron-builder/issues/6865

!include "LogicLib.nsh"

!macro customInit
  ; Best-effort: close a running instance before uninstall/reinstall.
  nsExec::ExecToLog 'taskkill /F /IM "AIGenius.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "AIGenius Helper.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "AIGenius Helper (GPU).exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "AIGenius Helper (Renderer).exe" /T'
!macroend

; Native mini-server modules (better-sqlite3, sharp, onnxruntime-node) require the VC++
; Redistributable. Without it the mini-server crashes silently on startup and users see only
; "Timeout waiting for http://127.0.0.1:8001/health" with no way to self-diagnose. Bundled by
; scripts/download-vcredist.cjs (see prepackage:win) and installed if missing.
;
; IMPORTANT: this installer runs per-user/unelevated (nsis.oneClick=false, no perMachine), but
; installing the redistributable requires admin rights. Plain ExecWait uses CreateProcess, which
; does NOT honor the vc_redist.x64.exe "requireAdministrator" manifest and silently fails with no
; UAC prompt at all — that was the original bug. ExecShellWait uses ShellExecuteEx, which properly
; triggers the native Windows UAC consent dialog. If the user has no admin rights or declines, the
; app's own runtime self-heal (see vcredist-guard.ts) is the fallback.
!macro customInstall
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\X64" "Installed"
  ${If} $0 <> 1
    DetailPrint "Installing Microsoft Visual C++ Redistributable (Windows will ask for approval)..."
    SetOutPath "$TEMP"
    File "/oname=vc_redist.x64.exe" "${BUILD_RESOURCES_DIR}\vcredist\vc_redist.x64.exe"
    ClearErrors
    ExecShellWait "runas" "$TEMP\vc_redist.x64.exe" "/install /quiet /norestart" SW_HIDE
    ${If} ${Errors}
      DetailPrint "VC++ Redistributable install was declined or failed — AIGenius will retry on first launch."
    ${Else}
      DetailPrint "VC++ Redistributable install completed."
    ${EndIf}
    Delete "$TEMP\vc_redist.x64.exe"
  ${EndIf}
!macroend

!macro customRemoveFiles
  DetailPrint "Removing old application files..."
  RMDir /r "$INSTDIR"
!macroend

!macro customUnInstallCheck
!macroend
