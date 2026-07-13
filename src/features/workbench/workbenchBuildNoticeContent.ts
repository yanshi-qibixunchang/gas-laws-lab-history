import type { WorkbenchLanguagePreference } from './workbenchGeneralSettings.ts';
import type {
  WorkbenchBuildNoticeLegalFile,
  WorkbenchBuildNoticeSection,
  WorkbenchLegalMaterialId,
} from './workbenchBuildNoticeContract.ts';

export const buildNoticeLegalMaterialFiles: Record<WorkbenchLegalMaterialId, WorkbenchBuildNoticeLegalFile> = {
  dependencies: { previewPath: '/legal/third-party-dependencies.html', previewKind: 'html' },
  licenseTexts: { previewPath: '/legal/third-party-license-texts.html', previewKind: 'html' },
  electron: { previewPath: '/legal/LICENSE.electron.txt', previewKind: 'text' },
  chromium: { largeFile: true },
  fonts: { previewPath: '/legal/font-licenses.txt', previewKind: 'text' },
  exporter: { previewPath: '/legal/exporter-licenses.html', previewKind: 'html' },
  audio: { previewPath: '/legal/audio-materials.html', previewKind: 'html' },
};

export const buildNoticeSections: Record<WorkbenchLanguagePreference, WorkbenchBuildNoticeSection[]> = {
  'zh-CN': [
    {
      id: 'localPermissions',
      eyebrow: '权限',
      title: '本机权限说明',
      paragraphs: [
        '热容比实验室默认在用户本机运行。软件不要求注册账户，也不主动要求用户提供姓名、手机号、身份证号、地址、支付信息等个人身份信息。',
        '软件在安装、运行、导出和更新过程中，可能使用以下本机能力：',
      ],
      bullets: [
        '保存工作区会话、界面设置、布局默认值、关闭文件记录和更新提示偏好。',
        '读取用户主动打开或导入的实验文件。',
        '将用户主动导出的报告、图表、CSV 数据和元数据写入本地目录。',
        '在导出 PDF 报告或完整实验包时，临时生成中间文件。',
        '在桌面版中检查更新、下载更新或打开项目用户指南页面。',
        '在卸载桌面版时，根据用户选择保留或删除应用数据和缓存。',
      ],
    },
    {
      id: 'localDataAccess',
      eyebrow: '数据',
      title: '本地数据与文件访问',
      paragraphs: [
        '软件可能在浏览器本地存储、浏览器会话存储、桌面应用用户数据目录、系统文档目录、系统临时目录或用户选择的导出目录中保存数据。',
        '可能保存或处理的数据包括：',
      ],
      bullets: [
        '实验文件名称、实验类型、实验参数、采样数据、模拟结果和导出元数据。',
        '工作区状态，例如当前打开的实验文件、选中的窗口、面板布局和关闭文件记录。',
        '通用设置，例如语言、主题、界面偏好、布局默认值和忽略的更新版本。',
        '导出状态、运行提示、警告信息和本地控制台中显示的操作记录。',
        '用户主动选择的导入路径、保存路径或导出目录。',
      ],
    },
    {
      id: 'localFileExport',
      eyebrow: '导出',
      title: '本地导出与临时文件',
      paragraphs: [
        '桌面版默认导出目录为系统“文档”目录下的 Heat Capacity Ratio Lab Exports 文件夹。用户也可以在导出时选择其他目录。',
        'PDF 报告导出过程中，软件可能在系统临时目录中写入中间 JSON 文件和临时输出目录。导出结束后，软件会清理该次导出的临时目录。用户最终导出的 PDF、图表、CSV 和元数据文件由用户自行管理。',
        '用户可以通过浏览器站点数据清理功能删除网页版或预览版保存的本地数据。Windows 桌面版卸载时会提示用户是否删除应用数据和缓存；用户也可以手动删除已经导出的文件和本机缓存。',
      ],
    },
    {
      id: 'networkAccess',
      eyebrow: '网络',
      title: '网络访问说明',
      paragraphs: [
        '软件的核心实验、记录和导出功能以本地运行为主。以下功能可能访问外部网络：',
      ],
      bullets: [
        '打开用户指南：跳转到项目 GitHub 页面或相关在线文档。',
        '检查更新：桌面版通过配置的 GitHub Release 更新源检查是否存在新版本。',
        '下载更新：用户确认后，桌面版可能下载新版安装包。',
        '手动下载：当自动更新不可用或用户主动选择时，软件可能打开可信的下载页面。',
      ],
    },
    {
      id: 'networkBoundary',
      eyebrow: '网络',
      title: '网络数据边界',
      paragraphs: [
        '软件不会把实验文件或实验结果作为检查更新的内容上传。网络服务提供方可能依据其自身隐私政策记录常规访问日志，例如 IP 地址、请求时间和客户端环境信息。',
        '如果用户不希望软件访问外部网络，可以避免使用在线用户指南、检查更新、下载更新和手动下载入口。本地实验、数据记录、结果查看和已经安装的导出功能仍可继续使用。',
      ],
    },
    {
      id: 'thirdPartyLicenses',
      eyebrow: '开源',
      title: '第三方开源许可',
      paragraphs: [
        '热容比实验室使用第三方开源组件完成界面渲染、3D 可视化、桌面打包、自动更新、PDF 处理、浏览器测试、样式构建、字体显示和报告导出等功能。',
        '本软件尊重第三方开源许可证。用户可以在本页面查看第三方组件的名称、版本、许可证、来源链接、版权声明、许可证全文和必要的通知文件。',
        '第三方开源组件的许可证适用于对应组件本身。除第三方许可证另有约定外，热容比实验室的项目特有代码、界面设计、实验文案、模拟流程、模型组织、导出模板和构建配置由相应权利人保留权利。',
      ],
    },
    {
      id: 'licenseMaterials',
      eyebrow: '材料',
      title: '第三方许可材料',
      paragraphs: ['以下材料可在本页面中查看，或通过本页面打开随软件分发的本地许可文件。'],
      materials: [
        { id: 'dependencies', title: '完整第三方依赖清单', description: 'npm 依赖、版本、许可证、来源链接和安装位置' },
        { id: 'licenseTexts', title: '许可证全文', description: 'MIT、ISC、Apache-2.0、BSD、MPL-2.0、OFL、CC-BY-4.0、0BSD、Unlicense、BlueOak、Python-2.0、WTFPL 及相关双许可证文本' },
        { id: 'electron', title: 'Electron 许可证', description: 'Electron 运行时许可证文本' },
        { id: 'chromium', title: 'Chromium 第三方许可证', description: 'Chromium 及其第三方组件许可证集合' },
        { id: 'fonts', title: '字体许可证', description: 'Noto Sans SC、JetBrains Mono 字体许可说明' },
        { id: 'exporter', title: '导出组件许可证', description: '报告导出组件及其 Python 依赖许可说明' },
        { id: 'audio', title: '音效素材与许可', description: '热容比实验音效的用途、原始来源、作者、CC0 许可与程序化音效说明' },
      ],
    },
    {
      id: 'runtimeComponents',
      eyebrow: '组件',
      title: '直接使用的运行时组件',
      paragraphs: ['以下组件为软件运行或桌面功能直接使用的第三方 npm 依赖。完整组件名称、锁定版本、来源链接和安装位置以“完整第三方依赖清单”为准。'],
      tables: [
        {
          headers: ['组件', '用途', '许可证'],
          rows: [
            ['React / React DOM', '用户界面渲染', 'MIT'],
            ['Three.js', '3D 场景渲染', 'MIT'],
            ['React Three Fiber / Drei', 'React 与 Three.js 集成', 'MIT'],
            ['Electron Updater', '桌面版自动更新', 'MIT'],
            ['PDF.js', 'PDF 预览和处理能力', 'Apache-2.0'],
            ['Lucide React', '界面图标', 'ISC'],
            ['Capacitor 相关组件', '应用平台接口和文件能力', 'MIT'],
          ],
        },
      ],
    },
    {
      id: 'electronChromium',
      eyebrow: '桌面',
      title: 'Electron 与 Chromium',
      paragraphs: [
        'Windows 桌面版使用 Electron 构建。Electron 本身基于 Chromium，并包含 Chromium 相关第三方开源组件。',
        '用户可以通过以下入口查看相关许可材料：',
      ],
      tables: [
        {
          headers: ['入口', '内容'],
          rows: [
            ['查看 Electron 许可证', 'Electron 许可证文本'],
            ['查看 Chromium 第三方许可证', 'Chromium 第三方许可证集合'],
          ],
        },
      ],
    },
    {
      id: 'fontsResources',
      eyebrow: '字体',
      title: '字体与界面资源',
      paragraphs: [
        '软件包含本地字体文件，用于保证界面在离线环境和桌面环境中的显示一致性。',
      ],
      tables: [
        {
          headers: ['字体', '许可证'],
          rows: [
            ['Noto Sans SC', 'SIL Open Font License 1.1'],
            ['JetBrains Mono', 'SIL Open Font License 1.1'],
          ],
        },
      ],
    },
    {
      id: 'iconResources',
      eyebrow: '图标',
      title: '界面图标',
      paragraphs: ['界面图标主要来自 Lucide React，许可证为 ISC。'],
    },
    {
      id: 'exporterComponents',
      eyebrow: '导出',
      title: '导出组件',
      paragraphs: [
        '软件的部分报告导出功能可能使用本地导出组件。导出组件可能包含 Python 运行时依赖和用于生成图表、PDF 报告或数据文件的第三方包。',
        '用户可以通过“查看导出组件许可证”入口查看导出组件及其依赖的许可材料。',
      ],
    },
    {
      id: 'audioMaterials',
      eyebrow: '音效',
      title: '音效素材与程序化音频',
      paragraphs: [
        '热容比实验中的开关、阀门、旋钮、打气球和书写音效使用项目音频清单中记录的 CC0 素材，并在软件内进行裁切和处理。来源标题、作者、链接与许可信息可通过“音效素材与许可”入口查看。',
        '放气声由软件运行时使用噪声、滤波器与包络程序化生成，不包含外部录音样本，因此没有额外的第三方录音素材许可。',
      ],
    },
    {
      id: 'usageBoundary',
      eyebrow: '边界',
      title: '使用边界',
      paragraphs: [
        '用户可以在合法取得软件后安装和运行本软件，并使用自己生成的实验数据、报告、图表和导出文件。',
        '未经权利人单独授权，用户不得删除版权和许可说明、冒充软件作者、重新销售软件整体、将软件用于侵权用途，或以破坏更新、绕过保护、获取未授权数据为目的修改软件。',
        '第三方组件的许可证不限制用户正常使用本软件生成自己的实验记录和报告；但用户在再分发软件、修改软件、二次打包或商业分发时，应重新核对全部第三方许可证要求。',
      ],
    },
    {
      id: 'userConfirmation',
      eyebrow: '确认',
      title: '用户确认',
      paragraphs: [
        '用户继续安装、运行或使用本软件，即表示已经阅读并理解本页面关于本地权限、文件访问、网络访问、第三方开源许可和软件使用边界的说明。',
        '如果用户不同意本页面内容，可以停止使用软件，并根据需要删除本地导出文件、浏览器站点数据、桌面应用数据和应用缓存。',
      ],
    },
  ],
  'zh-TW': [
    {
      id: 'localPermissions',
      eyebrow: '權限',
      title: '本機權限說明',
      paragraphs: ['熱容比實驗室預設在使用者本機執行。軟體不要求註冊帳戶，也不主動要求使用者提供姓名、手機號碼、身分證號、地址、付款資訊等個人身分資訊。', '軟體在安裝、執行、匯出和更新過程中，可能使用以下本機能力：'],
      bullets: ['保存工作區會話、介面設定、版面預設值、關閉檔案記錄和更新提示偏好。', '讀取使用者主動開啟或匯入的實驗檔案。', '將使用者主動匯出的報告、圖表、CSV 資料和中繼資料寫入本機目錄。', '在匯出 PDF 報告或完整實驗包時，暫時產生中間檔案。', '在桌面版中檢查更新、下載更新或開啟專案使用者指南頁面。', '在解除安裝桌面版時，依據使用者選擇保留或刪除應用程式資料和快取。'],
    },
    { id: 'localDataAccess', eyebrow: '資料', title: '本機資料與檔案存取', paragraphs: ['軟體可能在瀏覽器本機儲存、瀏覽器會話儲存、桌面應用程式使用者資料目錄、系統文件目錄、系統暫存目錄或使用者選擇的匯出目錄中保存資料。', '可能保存或處理的資料包括：'], bullets: ['實驗檔案名稱、實驗類型、實驗參數、取樣資料、模擬結果和匯出中繼資料。', '工作區狀態，例如目前開啟的實驗檔案、選中的視窗、面板版面和關閉檔案記錄。', '通用設定，例如語言、主題、介面偏好、版面預設值和忽略的更新版本。', '匯出狀態、執行提示、警告資訊和本機控制台中顯示的操作記錄。', '使用者主動選擇的匯入路徑、保存路徑或匯出目錄。'] },
    { id: 'localFileExport', eyebrow: '匯出', title: '本機匯出與暫存檔案', paragraphs: ['桌面版預設匯出目錄為系統「文件」目錄下的 Heat Capacity Ratio Lab Exports 資料夾。使用者也可以在匯出時選擇其他目錄。', 'PDF 報告匯出過程中，軟體可能在系統暫存目錄中寫入中間 JSON 檔案和暫時輸出目錄。匯出結束後，軟體會清理該次匯出的暫存目錄。使用者最終匯出的 PDF、圖表、CSV 和中繼資料檔案由使用者自行管理。', '使用者可以透過瀏覽器網站資料清理功能刪除網頁版或預覽版保存的本機資料。Windows 桌面版解除安裝時會提示使用者是否刪除應用程式資料和快取；使用者也可以手動刪除已經匯出的檔案和本機快取。'] },
    { id: 'networkAccess', eyebrow: '網路', title: '網路存取說明', paragraphs: ['軟體的核心實驗、記錄和匯出功能以本機執行為主。以下功能可能存取外部網路：'], bullets: ['開啟使用者指南：跳轉到專案 GitHub 頁面或相關線上文件。', '檢查更新：桌面版透過配置的 GitHub Release 更新來源檢查是否存在新版本。', '下載更新：使用者確認後，桌面版可能下載新版安裝包。', '手動下載：當自動更新不可用或使用者主動選擇時，軟體可能開啟可信的下載頁面。'] },
    { id: 'networkBoundary', eyebrow: '網路', title: '網路資料邊界', paragraphs: ['軟體不會把實驗檔案或實驗結果作為檢查更新的內容上傳。網路服務提供方可能依據其自身隱私政策記錄常規存取日誌，例如 IP 位址、請求時間和客戶端環境資訊。', '如果使用者不希望軟體存取外部網路，可以避免使用線上使用者指南、檢查更新、下載更新和手動下載入口。本機實驗、資料記錄、結果查看和已經安裝的匯出功能仍可繼續使用。'] },
    { id: 'thirdPartyLicenses', eyebrow: '開源', title: '第三方開源授權', paragraphs: ['熱容比實驗室使用第三方開源元件完成介面渲染、3D 視覺化、桌面打包、自動更新、PDF 處理、瀏覽器測試、樣式建置、字型顯示和報告匯出等功能。', '本軟體尊重第三方開源授權。使用者可以在本頁面查看第三方元件的名稱、版本、授權、來源連結、版權聲明、授權全文和必要通知文件。', '第三方開源元件的授權適用於對應元件本身。除第三方授權另有約定外，熱容比實驗室的專案特有程式碼、介面設計、實驗文案、模擬流程、模型組織、匯出範本和建置配置由相應權利人保留權利。'] },
    { id: 'licenseMaterials', eyebrow: '材料', title: '第三方授權材料', paragraphs: ['以下材料可在本頁面中查看，或透過本頁面開啟隨軟體分發的本機授權文件。'], materials: [{ id: 'dependencies', title: '完整第三方依賴清單', description: 'npm 依賴、版本、授權、來源連結和安裝位置' }, { id: 'licenseTexts', title: '授權全文', description: 'MIT、ISC、Apache-2.0、BSD、MPL-2.0、OFL、CC-BY-4.0、0BSD、Unlicense、BlueOak、Python-2.0、WTFPL 及相關雙授權文本' }, { id: 'electron', title: 'Electron 授權', description: 'Electron 執行時授權文本' }, { id: 'chromium', title: 'Chromium 第三方授權', description: 'Chromium 及其第三方元件授權集合' }, { id: 'fonts', title: '字型授權', description: 'Noto Sans SC、JetBrains Mono 字型授權說明' }, { id: 'exporter', title: '匯出元件授權', description: '報告匯出元件及其 Python 依賴授權說明' }, { id: 'audio', title: '音效素材與授權', description: '熱容比實驗音效用途、原始來源、作者、CC0 授權與程式化音效說明' }] },
    { id: 'runtimeComponents', eyebrow: '元件', title: '直接使用的執行時元件', paragraphs: ['以下元件為軟體執行或桌面功能直接使用的第三方 npm 依賴。完整元件名稱、鎖定版本、來源連結和安裝位置以「完整第三方依賴清單」為準。'], tables: [{ headers: ['元件', '用途', '授權'], rows: [['React / React DOM', '使用者介面渲染', 'MIT'], ['Three.js', '3D 場景渲染', 'MIT'], ['React Three Fiber / Drei', 'React 與 Three.js 整合', 'MIT'], ['Electron Updater', '桌面版自動更新', 'MIT'], ['PDF.js', 'PDF 預覽和處理能力', 'Apache-2.0'], ['Lucide React', '介面圖示', 'ISC'], ['Capacitor 相關元件', '應用平台介面和檔案能力', 'MIT']] }] },
    { id: 'electronChromium', eyebrow: '桌面', title: 'Electron 與 Chromium', paragraphs: ['Windows 桌面版使用 Electron 建置。Electron 本身基於 Chromium，並包含 Chromium 相關第三方開源元件。', '使用者可以透過以下入口查看相關授權材料：'], tables: [{ headers: ['入口', '內容'], rows: [['查看 Electron 授權', 'Electron 授權文本'], ['查看 Chromium 第三方授權', 'Chromium 第三方授權集合']] }] },
    { id: 'fontsResources', eyebrow: '字型', title: '字型與介面資源', paragraphs: ['軟體包含本機字型檔案，用於保證介面在離線環境和桌面環境中的顯示一致性。'], tables: [{ headers: ['字型', '授權'], rows: [['Noto Sans SC', 'SIL Open Font License 1.1'], ['JetBrains Mono', 'SIL Open Font License 1.1']] }] },
    { id: 'iconResources', eyebrow: '圖示', title: '介面圖示', paragraphs: ['介面圖示主要來自 Lucide React，授權為 ISC。'] },
    { id: 'exporterComponents', eyebrow: '匯出', title: '匯出元件', paragraphs: ['軟體的部分報告匯出功能可能使用本機匯出元件。匯出元件可能包含 Python 執行時依賴和用於生成圖表、PDF 報告或資料檔案的第三方包。', '使用者可以透過「查看匯出元件授權」入口查看匯出元件及其依賴的授權材料。'] },
    { id: 'audioMaterials', eyebrow: '音效', title: '音效素材與程式化音訊', paragraphs: ['熱容比實驗中的開關、閥門、旋鈕、打氣球和書寫音效使用專案音訊清單記錄的 CC0 素材，並在軟體內進行裁切和處理。來源標題、作者、連結與授權資訊可透過「音效素材與授權」入口查看。', '放氣聲由軟體執行時使用雜訊、濾波器與包絡程式化生成，不包含外部錄音樣本，因此沒有額外的第三方錄音素材授權。'] },
    { id: 'usageBoundary', eyebrow: '邊界', title: '使用邊界', paragraphs: ['使用者可以在合法取得軟體後安裝和執行本軟體，並使用自己生成的實驗資料、報告、圖表和匯出檔案。', '未經權利人單獨授權，使用者不得刪除版權和授權說明、冒充軟體作者、重新銷售軟體整體、將軟體用於侵權用途，或以破壞更新、繞過保護、取得未授權資料為目的修改軟體。', '第三方元件的授權不限制使用者正常使用本軟體生成自己的實驗記錄和報告；但使用者在再分發軟體、修改軟體、二次打包或商業分發時，應重新核對全部第三方授權要求。'] },
    { id: 'userConfirmation', eyebrow: '確認', title: '使用者確認', paragraphs: ['使用者繼續安裝、執行或使用本軟體，即表示已經閱讀並理解本頁面關於本機權限、檔案存取、網路存取、第三方開源授權和軟體使用邊界的說明。', '如果使用者不同意本頁面內容，可以停止使用軟體，並根據需要刪除本機匯出檔案、瀏覽器網站資料、桌面應用程式資料和應用程式快取。'] },
  ],
  en: [
    { id: 'localPermissions', eyebrow: 'Permissions', title: 'Local Permissions', paragraphs: ['Heat Capacity Ratio Lab runs locally by default. The software does not require account registration and does not actively ask users to provide personal identity information such as name, phone number, government ID, address, or payment information.', 'During installation, use, export, and update operations, the software may use the following local capabilities:'], bullets: ['Save workspace sessions, interface settings, layout defaults, closed-file records, and update prompt preferences.', 'Read experiment files actively opened or imported by the user.', 'Write exported reports, figures, CSV data, and metadata to local directories selected by the user.', 'Create temporary intermediate files when exporting PDF reports or complete experiment bundles.', 'Check for updates, download updates, or open the project user guide page in the desktop app.', 'Keep or remove application data and cache during desktop uninstallation according to the user choice.'] },
    { id: 'localDataAccess', eyebrow: 'Data', title: 'Local Data and File Access', paragraphs: ['The software may store data in browser local storage, browser session storage, the desktop application user-data directory, the system Documents directory, the system temporary directory, or an export directory selected by the user.', 'Data that may be saved or processed includes:'], bullets: ['Experiment file names, experiment types, experiment parameters, sampled data, simulation results, and export metadata.', 'Workspace state, such as opened experiment files, selected windows, panel layouts, and closed-file records.', 'General settings, such as language, theme, interface preferences, layout defaults, and ignored update versions.', 'Export status, runtime prompts, warnings, and operation records shown in the local console.', 'Import paths, save paths, or export directories actively selected by the user.'] },
    { id: 'localFileExport', eyebrow: 'Export', title: 'Local Export and Temporary Files', paragraphs: ['The desktop app exports by default to the Heat Capacity Ratio Lab Exports folder under the system Documents directory. Users may also select another directory during export.', 'During PDF report export, the software may write intermediate JSON files and temporary output folders in the system temporary directory. After export, the software cleans up the temporary directory for that export. Final exported PDF, figure, CSV, and metadata files are managed by the user.', 'Users can remove browser or preview data through browser site-data cleanup. The Windows desktop uninstaller asks whether to remove application data and cache; users may also manually remove exported files and local cache.'] },
    { id: 'networkAccess', eyebrow: 'Network', title: 'Network Access', paragraphs: ['Core experiment, recording, and export features run locally. The following features may access the external network:'], bullets: ['Open the user guide: opens the project GitHub page or related online documentation.', 'Check for updates: the desktop app checks the configured GitHub Release update source for new versions.', 'Download updates: after user confirmation, the desktop app may download a new installer.', 'Manual download: when automatic update is unavailable or selected by the user, the software may open a trusted download page.'] },
    { id: 'networkBoundary', eyebrow: 'Network', title: 'Network Data Boundary', paragraphs: ['The software does not upload experiment files or experiment results as update-check content. Network service providers may record standard access logs according to their own privacy policies, such as IP address, request time, and client environment information.', 'Users who do not want the software to access the external network can avoid the online user guide, update check, update download, and manual download entries. Local experiments, data recording, result viewing, and installed export features remain available.'] },
    { id: 'thirdPartyLicenses', eyebrow: 'Open Source', title: 'Third-Party Open-Source Licenses', paragraphs: ['Heat Capacity Ratio Lab uses third-party open-source components for UI rendering, 3D visualization, desktop packaging, automatic updates, PDF handling, browser testing, style building, font display, and report export.', 'The software respects third-party open-source licenses. Users can view component names, versions, licenses, source links, copyright notices, license texts, and required notice files from this page.', 'Third-party open-source licenses apply to their corresponding components. Unless otherwise provided by third-party licenses, project-specific code, interface design, experiment text, simulation flows, model organization, export templates, and build configuration for Heat Capacity Ratio Lab remain reserved by their respective rights holders.'] },
    { id: 'licenseMaterials', eyebrow: 'Materials', title: 'Third-Party License Materials', paragraphs: ['The following materials can be viewed on this page or opened from local license files distributed with the software.'], materials: [{ id: 'dependencies', title: 'Complete third-party dependency list', description: 'npm dependencies, versions, licenses, source links, and install locations' }, { id: 'licenseTexts', title: 'License texts', description: 'MIT, ISC, Apache-2.0, BSD, MPL-2.0, OFL, CC-BY-4.0, 0BSD, Unlicense, BlueOak, Python-2.0, WTFPL, and related dual-license texts' }, { id: 'electron', title: 'Electron license', description: 'Electron runtime license text' }, { id: 'chromium', title: 'Chromium third-party licenses', description: 'Chromium and bundled third-party component license collection' }, { id: 'fonts', title: 'Font licenses', description: 'License notes for Noto Sans SC and JetBrains Mono' }, { id: 'exporter', title: 'Exporter component licenses', description: 'License notes for report exporter components and their Python dependencies' }, { id: 'audio', title: 'Audio materials and licenses', description: 'Heat-capacity audio uses, original sources, authors, CC0 licenses, and procedural-audio notes' }] },
    { id: 'runtimeComponents', eyebrow: 'Components', title: 'Direct Runtime Components', paragraphs: ['The following components are direct third-party npm dependencies used by the software runtime or desktop features. Complete component names, locked versions, source links, and install locations are provided in the complete third-party dependency list.'], tables: [{ headers: ['Component', 'Purpose', 'License'], rows: [['React / React DOM', 'UI rendering', 'MIT'], ['Three.js', '3D scene rendering', 'MIT'], ['React Three Fiber / Drei', 'React and Three.js integration', 'MIT'], ['Electron Updater', 'Desktop automatic updates', 'MIT'], ['PDF.js', 'PDF preview and handling', 'Apache-2.0'], ['Lucide React', 'Interface icons', 'ISC'], ['Capacitor components', 'Application platform and file capabilities', 'MIT']] }] },
    { id: 'electronChromium', eyebrow: 'Desktop', title: 'Electron and Chromium', paragraphs: ['The Windows desktop app is built with Electron. Electron is based on Chromium and includes Chromium-related third-party open-source components.', 'Users can view related license materials through the following entries:'], tables: [{ headers: ['Entry', 'Content'], rows: [['View Electron license', 'Electron license text'], ['View Chromium third-party licenses', 'Chromium third-party license collection']] }] },
    { id: 'fontsResources', eyebrow: 'Fonts', title: 'Fonts and Interface Resources', paragraphs: ['The software includes local font files to keep interface rendering consistent in offline and desktop environments.'], tables: [{ headers: ['Font', 'License'], rows: [['Noto Sans SC', 'SIL Open Font License 1.1'], ['JetBrains Mono', 'SIL Open Font License 1.1']] }] },
    { id: 'iconResources', eyebrow: 'Icons', title: 'Interface Icons', paragraphs: ['Interface icons are mainly provided by Lucide React under the ISC license.'] },
    { id: 'exporterComponents', eyebrow: 'Export', title: 'Exporter Components', paragraphs: ['Some report export features may use a local exporter component. The exporter may include Python runtime dependencies and third-party packages used to generate figures, PDF reports, or data files.', 'Users can view exporter component and dependency license materials through the View exporter component licenses entry.'] },
    { id: 'audioMaterials', eyebrow: 'Audio', title: 'Audio Materials and Procedural Sound', paragraphs: ['Switch, valve, knob, pump-bulb, and writing sounds in the heat-capacity experiment use CC0 materials recorded in the project audio manifest and edited for use in the software. Original titles, authors, links, and licenses are available from Audio materials and licenses.', 'The release sound is generated at runtime from noise, filters, and envelopes. It contains no external recording samples and therefore has no additional third-party recording license.'] },
    { id: 'usageBoundary', eyebrow: 'Boundary', title: 'Use Boundary', paragraphs: ['Users may install and run the software after obtaining it legally, and may use experiment data, reports, figures, and exported files generated by themselves.', 'Without separate authorization from the rights holder, users must not remove copyright or license notices, impersonate the software author, resell the software as a whole, use the software for infringing purposes, or modify the software to break updates, bypass protection, or obtain unauthorized data.', 'Third-party component licenses do not restrict normal use of this software to generate user experiment records and reports. Users who redistribute, modify, repackage, or commercially distribute the software should re-check all third-party license requirements.'] },
    { id: 'userConfirmation', eyebrow: 'Confirmation', title: 'User Confirmation', paragraphs: ['By continuing to install, run, or use this software, users confirm that they have read and understood this page regarding local permissions, file access, network access, third-party open-source licenses, and software use boundaries.', 'Users who do not agree with this page may stop using the software and remove local exported files, browser site data, desktop application data, and application cache as needed.'] },
  ],
};
