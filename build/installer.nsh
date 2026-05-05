!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "是否清除 Hard Sphere Lab 的用户数据和缓存？$\r$\n$\r$\n点“是/Yes”：清除实验、设置和缓存，重新安装后恢复初始状态。$\r$\n点“否/No”：保留实验、设置和缓存，重新安装后继续使用原状态。$\r$\n$\r$\nRemove Hard Sphere Lab user data and cache?" IDNO keepHardSphereLabUserData
    RMDir /r "$APPDATA\hard-sphere-lab"
    RMDir /r "$LOCALAPPDATA\hard-sphere-lab-updater"
  keepHardSphereLabUserData:
!macroend
