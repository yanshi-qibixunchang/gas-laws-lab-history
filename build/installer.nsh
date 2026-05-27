!define HSL_RemoveUserDataPrompt "是否删除热容比实验室的用户数据和缓存？$\r$\n$\r$\n是：删除实验文件、设置和缓存的工作区数据。$\r$\n否：保留实验文件、设置和缓存的工作区数据。"

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
