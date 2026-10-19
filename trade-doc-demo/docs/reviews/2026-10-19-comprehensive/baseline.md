# 审查版本和证据基线

2026-10-19。唯一开发源为正式克隆`trade-doc-demo/`，未改旧Mac目录。起始HEAD为4c674496667fd31078194ca81c0d0a4f081eda21，根树a47441068e2047eefb7d7aa60dcf6921a8471b2c；开工仅有本聊天上一轮方案与HANDOFF文档差异。没有自动pull、硬重置或覆盖他人提交。

`evidence/baseline-results.json`记录Node v22.23.1/darwin/arm64、逐脚本输出／退出码／时长及运行资源SHA256。基线40／51，最终`final-verified-results.json`为42／53；两次各自执行前后运行指纹一致，不把不同修复阶段的源指纹说成同一版本。首次final-results早于UI-01，只作过程；最新final-verified覆盖该追加修改。

原型脚本、生产静态检查、VM断言、浏览器访问、布局、连续场景及图片数量分别统计。生产49PLANNED真实集成执行0。本轮反例使用新VM或内存替换；工程重放显式读取冻结Git版本，修复后仍可重现原测试漏检；业务旧缺陷探针和RED结果也保留。

Ego使用本轮唯一TaskSpace17、p1；先做100／300矩阵，再独立连续业务，开始独立场景显式reload复位。IAB仅补HTTP截图和禁用／重登的独立原生验收，没有绕过file协议约束。浏览器流程全部使用合成内存数据；重新加载按产品设计还原，不涉及正式数据库。

有效图为login-final-1280.png（实际JPEG1280×800）、stats-clean-final-1440.jpg（1432×1781）、invoice-final-1280.jpg（1272×1624）。长图实际宽扣除滚动条，不等同原视口；主控和独立评审均实际打开。stats-final-1440.png含Toast遮挡，只作过程。

复跑入口均位于本目录evidence。run-baseline.cjs生成指定标签的结果；browser-*.mjs只能在当前授权的TaskSpace运行，空间结束后不得自动重用或接管；后续应由操作者提供有效ID。它们是本次审查证据脚本，不作为通用无条件生产测试工具。
