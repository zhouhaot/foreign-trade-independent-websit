# 本地世界陆地几何

- 用途：工作台订单国家分布底图，无国家行政边界；不是导航或物流地图。
- 数据：Natural Earth 1:110m land，作者仓库 https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson ，2026-10-16取得。
- 来源许可：https://www.naturalearthdata.com/about/terms-of-use/ ，公共领域，可修改和分发。
- 输入 SHA-256：`9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`。
- `world-land.svg` SHA-256：`92f0de047e415017276683e72b10703779a59accb6daa5f828fae8457f203bdd`。
- 离线生成器：`scripts/build-world-map.cjs`，对GeoJSON投影并简化为SVG路径，点阵pattern填充；1000×430等距经纬示意，显示约85°N至60°S，不显示南极。无图像生成、无参考页图片像素、无政治边界。
- 输入文件不随运行页面加载；SVG随项目本地分发，file://可读，无地图服务请求。
- 客户国家锚点仅为 `js/views-core.js` 中人工配置的近似中心。首批覆盖美国、德国、法国、埃及、智利、英国；无订单不画光点，其他国家或无法唯一关联客户归“地点待补”。后续可显式扩展锚点，不从地址推断精确位置。
