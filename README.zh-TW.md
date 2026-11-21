# 氣律實驗室 · Gas Laws Lab

[English](./README.md) · [简体中文](./README.zh-CN.md)

氣律實驗室是 Windows 實驗教學工作臺，將三維儀器操作、物理模擬、資料採集、逐步計算及實驗報告放在同一流程中。適用於硬球分子動力學、理想氣體關係，以及空氣和氦氣比熱容比實驗。

**目前正式版：6.5.5**

[下載 Windows 64 位元安裝程式](https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/download/v6.5.5/heat-capacity-lab-setup-6.5.5.exe) · [版本說明與全部資產](https://github.com/yanshi-qibixunchang/gas-laws-lab-release/releases/tag/v6.5.5) · [發行核驗記錄](docs/releases/v6.5.5.md) · [原始碼 Release](https://github.com/yanshi-qibixunchang/gas-laws-lab-history/releases/tag/v6.5.5)

## 實驗內容

| 實驗 | 主要內容 |
| --- | --- |
| 標準硬球模擬 | 三維分子運動、即時圖表、統計與結果分析 |
| 理想氣體關係 | P–T、P–V、P–N 取樣、擬合、關係驗證與歷史記錄 |
| 絕熱膨脹法 | 儀器操作、壓強與溫度訊號、重複實驗、比熱容比及不確定度計算 |
| 活塞振動法 | 按壓釋放與週期測量；未知體積多高度擬合，或真實空氣已知總體積單次直接計算 |

兩種比熱容比實驗均支援**空氣／氦氣、理想／真實條件**，以及演示、引導、自由模式。介面提供簡體中文、繁體中文及英文，支援明暗主題。桌面版可依實驗支援的項目匯出 PDF 報告、PDF／PNG 圖像、CSV 及資料包。

## 6.5.5 更新內容

本版是**參賽示範版本**。在**設定 → 一般 → 學習與引導 → 重新開始首次引導**，可以重新觀看軟體介紹、選擇學習路徑及確認第三方聲明。實驗教學進行中也可重開，既有實驗檔案、擷取記錄與一般設定會保留。

## 安裝、升級與資料

下載正式安裝程式並依精靈操作。已安裝 **6.5.4 或更早版本** 的使用者可在軟體中檢查更新，也可先儲存並正常結束，再將完整安裝程式裝到原安裝目錄。

升級沿用應用識別及資料目錄。舊實驗保留歷史模型、參數快照、原始記錄與計算進度，新建實驗使用現行模型。較早版本若觸發既有遷移規則，以軟體提示為準。

核心實驗在本機運行，不需註冊帳戶。網頁版與桌面版分別儲存進度，安裝不會自動搬移瀏覽器中的實驗。網頁版可體驗操作與計算；報告、圖像及表格匯出使用 Windows 桌面版。

## 模型與使用範圍

「理想／真實」表示實驗過程條件。理想條件仍需正確操作；真實條件加入熱交換、機械損耗及測量影響，核驗範圍與未通過項均有明確記錄，不代表所有實體裝置都會得到相同結果。氦氣部分工況採用已確認的空氣範圍按精確比例 25/21 確定驗收範圍，不應視為氦氣實測曲線。

三維儀器模型負責展示與互動，數值由軟體物理模型產生。絕熱膨脹裝置參考多種教學儀器，其中包括 FD-NCD-C；本專案不是該設備的官方模擬或數位複刻。模型、音效及物理文獻來源可在軟體「關於」及 [第三方說明](THIRD_PARTY_NOTICES.md) 中查看。

## 原始碼與開發

- [公開原始碼歷史](https://github.com/yanshi-qibixunchang/gas-laws-lab-history)：經隱私整理的原始碼、測試及版本標籤。
- [正式發佈倉庫](https://github.com/yanshi-qibixunchang/gas-laws-lab-release)：安裝程式、更新清單、差分檔及使用者文件。
- [文件地圖](docs/README.md)：物理模型、架構、來源記錄與發行證據。

```powershell
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

本地預覽：http://127.0.0.1:5174/

```powershell
npm.cmd run check
npm.cmd audit --omit=dev
npm.cmd run legal:check
npm.cmd run desktop:installer
```

正式更新必須同時提供同版 `heat-capacity-lab-setup-<版本>.exe`、`.exe.blockmap` 及 `latest.yml`。建置輸出預設在 `release/`；建置不會自動發佈。相依套件、快取、建置產物及個人實驗資料不應提交至原始碼倉庫。

`src/domain/` 存放物理與計算模型，`src/features/` 存放工作臺和實驗流程，`electron/` 提供桌面橋接與更新，`tools/exporter/` 提供本地匯出器，`tests/` 包含回歸檢查。

## 授權與回饋

專案原始碼未宣告開源授權；公開可讀不等於取得再散布權利。第三方程式庫、字型、音效、模型及匯出器依各自記錄的授權或權利狀態使用，軟體內提供精確版本的第三方清單。參見 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)、[安全說明](SECURITY.md) 及 [協作說明](CONTRIBUTING.md)。

回饋時請附上軟體版本、實驗方法、氣體與條件、操作步驟及截圖。分享實驗檔前請移除個人資訊。6.5.5 發佈後的修正將記錄於後續修補版本。
