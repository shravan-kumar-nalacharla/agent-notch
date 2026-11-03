!macro customUnInit
  Var /GLOBAL notchEraseData
  StrCpy $notchEraseData "0"
  ${IfNot} ${isUpdated}
  ${AndIfNot} ${Silent}
    MessageBox MB_YESNO|MB_DEFBUTTON2|MB_ICONQUESTION "Also delete Agent Notch personal data? This includes saved API keys, settings, notes and history. Choose No to keep your data for reinstalling." IDNO notch_keep_data
    MessageBox MB_YESNO|MB_DEFBUTTON2|MB_ICONEXCLAMATION "Permanently erase Agent Notch personal data? This cannot be undone. User documents and third-party applications will not be removed." IDNO notch_keep_data
    StrCpy $notchEraseData "1"
    notch_keep_data:
  ${EndIf}
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=cleanup-hooks.cjs "${PROJECT_DIR}\installer\cleanup-hooks.cjs"
    ReadEnvStr $R1 "ELECTRON_RUN_AS_NODE"
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("ELECTRON_RUN_AS_NODE", "1").r0'
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$PLUGINSDIR\cleanup-hooks.cjs" "${APP_PACKAGE_NAME}"' $0
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("ELECTRON_RUN_AS_NODE", "$R1").r0'
    SetOutPath "$INSTDIR"
  ${EndIf}
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_FILENAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_PACKAGE_NAME}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP_ID}"
  ${If} $notchEraseData == "1"
    SetShellVarContext current
    ; Only the package-owned Electron profile. Never remove APPDATA itself or legacy/shared folders.
    RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"
    ${If} $installMode == "all"
      SetShellVarContext all
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend
