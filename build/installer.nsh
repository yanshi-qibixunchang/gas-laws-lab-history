!macro customHeader
  LangString HSL_RemoveUserDataPrompt ${LANG_SIMPCHINESE} "是否删除热容比实验室的用户数据和缓存？$\r$\n$\r$\n是：删除实验文件、设置和缓存的工作区数据。$\r$\n否：保留实验文件、设置和缓存的工作区数据。"
  LangString HSL_RemoveUserDataPrompt ${LANG_TRADCHINESE} "是否刪除熱容比實驗室的使用者資料與快取？$\r$\n$\r$\n是：刪除實驗檔案、設定與快取的工作區資料。$\r$\n否：保留實驗檔案、設定與快取的工作區資料。"
  LangString HSL_RemoveUserDataPrompt ${LANG_ENGLISH} "Remove Heat Capacity Ratio Lab user data and cache?$\r$\n$\r$\nYes: remove experiments, settings, and cached workspace data.$\r$\nNo: keep experiments, settings, and cached workspace data."
!macroend

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2 "$(HSL_RemoveUserDataPrompt)" IDNO keepHardSphereLabUserData
    RMDir /r "$APPDATA\hard-sphere-lab"
    RMDir /r "$LOCALAPPDATA\hard-sphere-lab-updater"
  keepHardSphereLabUserData:
!macroend
