# 生成型验证证据

> 状态：当前可重复生成证据
> 最后核验：2026-08-31

`generated/` 保存由 `scripts/research-report/generate-evidence.ts` 统一生成的数值证据：

- `rapid-release/`：绝热膨胀法及其传感器、热交换和阀门响应验证；
- `ideal-gas/`：理想气体三类关系的固定种子回归；
- `hard-sphere/`：硬球分布、壁面压强和能量守恒验证。

生成元数据只记录仓库相对路径、Git 提交、工作树是否有改动及改动条目数量，不记录本机绝对路径或完整未提交文件名。
