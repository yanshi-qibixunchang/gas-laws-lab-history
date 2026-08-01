# 活塞振动法实验接入实施计划

## 目标与固定决策

- 保留现有绝热膨胀法持久化判别值：`kind: 'heatCapacity'`。
- 新增并列判别值：`kind: 'heatCapacityPistonOscillation'`。
- 绝热膨胀法默认文件名：`Adiabatic Expansion - NNN`。
- 活塞振动法默认文件名：`Piston Oscillation - NNN`。
- 活塞振动法与另外三类实验共用工作台文件生命周期、文件信封、布局外壳、缓存、撤销和恢复机制。
- 活塞振动法拥有独立 payload、独立 UI、独立模型预览；不得进入 standard、ideal 或旧 heat-capacity 运行时。
- 比赛阶段不实现底层物理、实时数据和手动拖动活塞；优先交付离线模型预览、相机操作和可验证的内嵌动画。

## 模型来源

- 仓库：`https://github.com/zyl57863-cmd/ex5531-ratio-specific-heats-blender-model`
- tag：`v1.2.1`
- commit：`79a26a2a7b13e082ac32507d02df20cbb2bd02e3`
- GLB：`deliverables_ex5531_final/EX5531_TD8572A_ratio_specific_heats_final.glb`
- 模型版本与哈希记录在应用级资产清单中，不写入每个实验文件。

## 批次 1：文件类型、持久化与运行时隔离

### 产物

- `WorkbenchFileKind` 增加 `heatCapacityPistonOscillation`。
- 新增 `WorkbenchHeatCapacityPistonOscillationState` 和默认工厂。
- 新增专用持久化 payload、校验器和恢复器。
- 文件工厂、编码、解码、会话恢复、IndexedDB 校验、快照、布局和运行时根分发改为显式四分支。
- 新类型暂不出现在普通创建菜单。
- 新类型恢复后只能进入最小安全 preview/realtime 占位，不挂载任何旧运行时。
- 旧自动文件名只在精确匹配系统格式时迁移；用户自定义名称保持不变。

### 数据约束

第一版专属状态只保存稳定且可序列化的内容：

```ts
interface WorkbenchHeatCapacityPistonOscillationState
  extends WorkbenchFileBase {
  kind: 'heatCapacityPistonOscillation';
  pistonOscillationSchemaVersion: 1;
  previewCameraPreset: 'overview' | 'front' | 'side' | 'top';
}
```

不得保存 Three.js Scene、Object3D、Renderer、材质、纹理、OrbitControls、AnimationMixer 或动画帧句柄。

### 验收门禁

- [ ] 四类文件可同时存在于同一会话。
- [ ] 新文件可创建、克隆、保存、关闭、恢复、删除和撤销。
- [ ] 新文件产生普通文件记录，但不产生 heat-capacity mode record。
- [ ] 新文件不进入 standard、ideal 或旧 heat-capacity 持久化与运行时。
- [ ] 旧版本工作区样本继续恢复。
- [ ] 用户自定义名称不被迁移。
- [ ] 未知 kind 和非法 payload 得到明确诊断。
- [ ] TypeScript、聚焦测试、全量测试和构建通过。
- [ ] 固定端口 `5174` 下旧三类实验回归正常。

## 批次 2：同级 UI 与开发中占位

### 产物

- 新建实验菜单增加：
  - `空气热容比（绝热膨胀法）`
  - `空气热容比（活塞振动法）`
- 活塞振动法文件在左侧顶层文件树与其他实验同级。
- 中央区使用相同的 preview/realtime 工作区外壳。
- preview 暂时显示模型待接入占位。
- realtime 显示完整灰色“当前功能正在开发中”占位。
- 左侧“实验指引、数据结果、过程回顾”使用新实验专用 panel key；双击只提示，不打开窗口、不写入 undo。
- 右侧参数栏始终收起；鼠标、键盘和布局恢复入口均只提示，不展开。
- 模式与运行控制禁用或隐藏。

### 验收门禁

- [ ] 四类文件的顶层选择、重命名、关闭、删除和缓存行为一致。
- [ ] 简体、繁体和英文菜单正确，英文文件名不随语言变化。
- [ ] 左侧三个未开放条目不会打开窗口或修改面板状态。
- [ ] 右侧栏不存在可绕过的展开路径。
- [ ] 被拒绝操作不产生撤销记录。
- [ ] 默认和最小侧栏宽度下名称表现可接受。
- [ ] 页面刷新后新实验及其布局安全恢复。
- [ ] 旧三类实验无 UI 和交互回归。

## 批次 3：固定接入 v1.2.1 GLB

### 资产策略

- 仅引入运行时需要的 GLB 和来源清单，不复制整个模型仓库或 CDN 预览器。
- 接入时计算并记录 GLB SHA-256。
- 使用 `import.meta.env.BASE_URL` 构造资源路径，保证 Electron `file://` 环境离线加载。
- 使用现有 Three.js、React Three Fiber、Drei 和 three-stdlib，不引入旧版 three.js 依赖。

### 功能范围

- GLB 加载、加载失败提示和重试。
- OrbitControls 旋转、缩放。
- 总览、前视、侧视、顶视和重置视角。
- 检查内嵌动画轨道；仅在确认其目标正确时开放播放/暂停。
- 不在本批实现手动拖动活塞和底层物理。

### 性能与资源约束

- 静止时按需渲染；动画播放时才持续渲染。
- 限制 DPR，第一版不启用高成本实时阴影。
- 只在活塞实验激活时挂载场景。
- 多个文件不得共享会被修改的 scene 实例。
- 文件切换和卸载时停止动画并释放组件拥有的资源。

### 验收门禁

- [ ] GLB、tag、commit 和 SHA-256 来源一致。
- [ ] GLB 2.0 与关键节点合同验证通过。
- [ ] `PistonAssembly_MOV` 和 `slide_z` 元数据存在。
- [ ] 无外部纹理和运行时网络依赖。
- [ ] 四个相机视角无遮挡或严重裁切。
- [ ] 断网和桌面打包环境可加载。
- [ ] 连续切换、挂载和卸载无 WebGL context 或明显内存泄漏。
- [ ] 构建产物包含模型资产。
- [ ] 模型来源授权和第三方 notice 满足发布要求。

## 代理与冲突控制

- 主协调代理唯一负责中央高冲突文件、Git、固定端口 `5174`、全量测试和最终接线。
- 架构/持久化代理只处理专用适配器、遗漏扫描和对应测试。
- UI 代理只处理新建的 `src/features/pistonOscillation/` 模块及其测试；中央接线由主协调代理完成。
- 模型/QA 代理只处理模型合同、来源哈希、许可证和只读回归。
- 不允许多个代理同时修改 `workbenchState.ts` 或 `WorkbenchStudioPrototype.tsx`，也不允许子代理切换分支、运行全局格式化、`npm install` 或占用 `5174`。

## 提交与发布边界

建议保持以下可回退提交：

1. `feat(workbench): register piston oscillation file kind`
2. `feat(workbench): persist and isolate piston oscillation files`
3. `feat(workbench): add piston oscillation workspace shell`
4. `feat(piston-oscillation): integrate pinned v1.2.1 model`
5. `docs(legal): record piston model provenance and notices`

三批全部完成并经用户验收后再确定版本号。版本号确认前不发布安装包或 GitHub Release。
