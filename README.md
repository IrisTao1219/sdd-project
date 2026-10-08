# 校园美食推荐助手

基于 React + TypeScript + Vite 与 Node.js + TypeScript + Express 的 MVP 项目骨架。

## 本地运行

```bash
npm install
npm run dev
```

- Web 页面：http://localhost:5173
- 后端接口：http://localhost:3001/api/v1/restaurants
- 健康检查：http://localhost:3001/api/v1/health

## 可用命令

```bash
npm run build
npm run typecheck
npm test
```

## 已完成功能

- 餐厅、档口与菜品数据浏览
- 餐厅、菜品、菜系与口味关键词搜索
- 预算、口味、距离、评分、营业状态、用餐时段和忌口筛选
- 距离、评分和价格排序
- Top 3—5 个性化推荐及数据可追溯理由
- 餐厅/档口详情与菜品详情
- URL 条件保留、推荐偏好保留、空状态和异常重试

示例数据位于 `server/data/campus-food-data.json`，服务启动时会完成结构校验。
