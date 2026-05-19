!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "Remove Hard Sphere Lab user data and cache?$\r$\n$\r$\nYes: remove experiments, settings, and cached workspace data.$\r$\nNo: keep experiments, settings, and cached workspace data." IDNO keepHardSphereLabUserData
    RMDir /r "$APPDATA\hard-sphere-lab"
    RMDir /r "$LOCALAPPDATA\hard-sphere-lab-updater"
  keepHardSphereLabUserData:
!macroend
