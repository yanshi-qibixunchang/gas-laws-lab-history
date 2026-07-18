!include "getProcessInfo.nsh"
Var pid

!define HSL_RemoveUserDataPrompt "是否删除气律实验室的用户数据和缓存？$\r$\n$\r$\n是：删除实验文件、设置和缓存的工作区数据。$\r$\n否：保留实验文件、设置和缓存的工作区数据。"
!define HSL_LegacyExecutableFilename "热容比实验室.exe"
!define HSL_UpdaterShutdownPollCount 26
!define HSL_ManualShutdownPollCount 110

!macro HSL_FindCompatibleAppProcess _RETURN
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" ${_RETURN}
  ${If} ${_RETURN} != 0
    ${nsProcess::FindProcess} "${HSL_LegacyExecutableFilename}" ${_RETURN}
  ${EndIf}
!macroend

!macro HSL_CloseCompatibleAppProcesses
  ${nsProcess::CloseProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${nsProcess::CloseProcess} "${HSL_LegacyExecutableFilename}" $R0
!macroend

!macro HSL_KillCompatibleAppProcesses
  ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${nsProcess::KillProcess} "${HSL_LegacyExecutableFilename}" $R0
!macroend

!macro customCheckAppRunning
  ${GetProcessInfo} 0 $pid $1 $2 $3 $4
  ${If} $3 != "${APP_EXECUTABLE_FILENAME}"
  ${AndIf} $3 != "${HSL_LegacyExecutableFilename}"
    ${If} ${isUpdated}
      Sleep 300
    ${EndIf}

    !insertmacro HSL_FindCompatibleAppProcess $R0
    ${If} $R0 == 0
      ${If} ${isUpdated}
        Sleep 1000
        Goto hslStopCompatibleProcesses
      ${EndIf}
      MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK hslStopCompatibleProcesses
      Quit

      hslStopCompatibleProcesses:
      DetailPrint "$(appClosing)"
      !insertmacro HSL_CloseCompatibleAppProcesses
      StrCpy $R1 0
      ${If} ${isUpdated}
        StrCpy $R2 ${HSL_UpdaterShutdownPollCount}
      ${Else}
        StrCpy $R2 ${HSL_ManualShutdownPollCount}
      ${EndIf}

      hslWaitForCompatibleProcesses:
      !insertmacro HSL_FindCompatibleAppProcess $R0
      ${If} $R0 == 0
        ${If} $R1 < $R2
          IntOp $R1 $R1 + 1
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close safely ($R1/$R2).`
          Sleep 500
          Goto hslWaitForCompatibleProcesses
        ${EndIf}

        ${If} ${isUpdated}
          DetailPrint `Update handoff did not exit "${PRODUCT_NAME}" after the persistence grace period; using the updater-only fallback.`
          !insertmacro HSL_KillCompatibleAppProcesses
          Sleep 1000
          !insertmacro HSL_FindCompatibleAppProcess $R0
          ${If} $R0 == 0
            Quit
          ${EndIf}
          Goto hslCompatibleProcessesClosed
        ${EndIf}

        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY hslRetryCompatibleProcesses
        Quit
      ${Else}
        Goto hslCompatibleProcessesClosed
      ${EndIf}

      hslRetryCompatibleProcesses:
      !insertmacro HSL_CloseCompatibleAppProcesses
      StrCpy $R1 0
      StrCpy $R2 ${HSL_ManualShutdownPollCount}
      Goto hslWaitForCompatibleProcesses

      hslCompatibleProcessesClosed:
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ${GetParameters} $R0
  ${GetOptions} $R0 "--updated" $R1
  ${IfNot} ${Errors}
    Goto keepHardSphereLabUserData
  ${EndIf}

  ${GetOptions} $R0 "/KEEP_APP_DATA" $R1
  ${IfNot} ${Errors}
    Goto keepHardSphereLabUserData
  ${EndIf}

  ${If} ${Silent}
    Goto keepHardSphereLabUserData
  ${EndIf}

  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "${HSL_RemoveUserDataPrompt}" IDNO keepHardSphereLabUserData
    RMDir /r "$APPDATA\hard-sphere-lab"
    RMDir /r "$LOCALAPPDATA\hard-sphere-lab-updater"
  keepHardSphereLabUserData:
!macroend
