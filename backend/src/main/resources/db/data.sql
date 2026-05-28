-- Clear old data on every startup (safe for SQLite with IF NOT EXISTS schema)
DELETE FROM inquiry;
DELETE FROM article;
DELETE FROM banner;
DELETE FROM product;
DELETE FROM product_category;
DELETE FROM sys_user;

-- ===== Categories =====
INSERT INTO product_category (id, name_cn, name_en, sort_order) VALUES
(1, '混合点钞机', 'Mixed Denomination Counters', 1),
(2, '清分机', 'Currency Sorters', 2),
(3, '验钞机', 'Counterfeit Detectors', 3),
(4, '便携点钞机', 'Portable Counters', 4),
(5, '银行专用设备', 'Banking Equipment', 5);

-- ===== Products (15 items) =====
INSERT INTO product (id, category_id, name_cn, name_en, description_cn, description_en, main_image, price, specifications, status, sort_order) VALUES

-- 混合点钞机 (1-4)
(1, 1, '智能混合点钞机 BC-3600', 'Smart Mixed Denomination Counter BC-3600',
 '支持混合面额点钞、自动识别面额、累计金额计算。配备高清触摸屏，支持多币种识别，适合银行、商超、财务等场景使用。内置双 CIS 传感器，鉴伪准确率达 99.99%。',
 'Supports mixed denomination counting, automatic denomination recognition, and cumulative amount calculation. Features HD touchscreen, multi-currency recognition, dual CIS sensors with 99.99% accuracy.',
 '/uploads/bc-3600.svg', '$580 - $780',
 '{"点钞速度":"1000张/分钟","进钞容量":"500张","接钞容量":"200张","鉴伪方式":"UV/MG/IR/MT/3D","显示屏":"4.3英寸触摸屏","支持币种":"美元/欧元/英镑/人民币等32种","电源":"AC 110V-240V","重量":"6.5kg","尺寸":"310×275×195mm"}',
 1, 1),

(2, 1, '高速混合点钞机 BC-5200', 'High Speed Mixed Counter BC-5200',
 '采用先进图像识别技术，支持混合面额高速清点，自动鉴伪、分版、计算总金额。大容量进钞斗 800 张，适合高频率使用场景。支持 WiFi 联网，可远程更新货币数据。',
 'Advanced image recognition technology, high-speed mixed denomination counting with WiFi connectivity. Large 800-note hopper for high-frequency scenarios.',
 '/uploads/bc-5200.svg', '$850 - $1200',
 '{"点钞速度":"1200张/分钟","进钞容量":"800张","接钞容量":"200张","鉴伪方式":"UV/MG/IR/MT/CIS","显示屏":"5英寸触摸屏","支持币种":"32种货币","连接方式":"USB/LAN/WiFi","电源":"AC 110V-240V","重量":"8.2kg","尺寸":"350×300×210mm"}',
 1, 2),

(3, 1, '桌面型点钞机 BC-2200', 'Desktop Money Counter BC-2200',
 '紧凑型桌面点钞机，支持批量计数、金额累加、面额识别。性价比高，适合中小型商铺、便利店、餐饮等场景。LED 数码显示，操作简便。',
 'Compact desktop counter with batch counting, amount accumulation, and denomination recognition. Cost-effective for small-medium businesses.',
 '/uploads/bc-2200.svg', '$180 - $320',
 '{"点钞速度":"1000张/分钟","进钞容量":"200张","接钞容量":"200张","鉴伪方式":"UV/MG/IR","显示屏":"LED数码管","计数模式":"累加/批量/面额","电源":"AC 110V-240V","重量":"4.2kg","尺寸":"280×240×175mm"}',
 1, 3),

(4, 1, '全自动点钞机 BC-8800', 'Fully Automatic Counter BC-8800',
 '旗舰级全自动点钞机，支持开机自检、自动进钞、自动清零。双 CIS 全幅面扫描，可识别拼接币、变造币。适合银行柜台、大型财务中心使用。',
 'Flagship fully automatic counter with self-test, auto-feed, full-width dual CIS scanning. Detects spliced and altered banknotes.',
 '/uploads/bc-8800.svg', '$1500 - $2200',
 '{"点钞速度":"1500张/分钟","进钞容量":"1000张","接钞容量":"300张","鉴伪方式":"UV/MG/IR/MT/CIS/3D/荧光","显示屏":"7英寸触摸屏","支持币种":"40+种","序列号":"OCR识别","连接方式":"USB/LAN/RS232","电源":"AC 220V","重量":"15kg","尺寸":"420×320×280mm"}',
 1, 4),

-- 清分机 (5-7)
(5, 2, '银行专用清分机 CS-800', 'Bank Grade Currency Sorter CS-800',
 '专业级银行清分机，支持多面额同时清分、ATM 配钞、残币识别。符合央行清分标准，可对接银行核心系统。四出钞口设计，支持面额/面向/版本自动分拣。',
 'Professional bank-grade sorter with multi-denomination sorting, ATM dispensing, and damaged note recognition. 4 output bins for denomination/orientation/version sorting.',
 '/uploads/cs-800.svg', '$2500 - $3800',
 '{"点钞速度":"800张/分钟","进钞容量":"1000张","出钞口":"4个","鉴伪方式":"UV/MG/IR/CIS/3D/MR","显示屏":"7英寸触摸屏","序列号":"OCR识别","连接方式":"USB/LAN/RS232","电源":"AC 220V","重量":"35kg","尺寸":"550×400×380mm"}',
 1, 1),

(6, 2, '桌面清分机 CS-400', 'Desktop Currency Sorter CS-400',
 '紧凑型桌面清分机，支持面额分拣、面向统一、真假鉴别。双出钞口，适合中小型金融机构、零售企业、连锁超市使用。',
 'Compact desktop sorter with denomination sorting, orientation unification, and counterfeit detection. 2 output bins for small-medium institutions.',
 '/uploads/cs-400.svg', '$1200 - $1800',
 '{"点钞速度":"600张/分钟","进钞容量":"300张","出钞口":"2个","鉴伪方式":"UV/MG/IR/CIS","显示屏":"3.5英寸LCD","电源":"AC 110V-240V","重量":"12kg","尺寸":"380×280×250mm"}',
 1, 2),

(7, 2, '高速清分机 CS-1200', 'High Speed Currency Sorter CS-1200',
 '高速清分机，每分钟可处理 1200 张纸币。支持 ATM 配钞、新旧分拣、残损币识别。双 CIS 全幅扫描，可识别所有已知假币特征。',
 'High-speed sorter processing 1200 notes/min. ATM dispensing, fitness sorting, dual CIS full-width scanning.',
 '/uploads/cs-1200.svg', '$3200 - $4500',
 '{"点钞速度":"1200张/分钟","进钞容量":"800张","出钞口":"4个","鉴伪方式":"UV/MG/IR/CIS/3D/MR/荧光","显示屏":"10英寸触摸屏","序列号":"OCR识别+记录","ATM配钞":"支持","连接方式":"USB/LAN/RS232","电源":"AC 220V","重量":"42kg","尺寸":"580×420×400mm"}',
 1, 3),

-- 验钞机 (8-10)
(8, 3, '专业验钞机 VD-200', 'Professional Counterfeit Detector VD-200',
 '多光谱验钞机，支持紫外、磁性、红外、多维检测。0.3 秒快速鉴别真伪，适合商超收银、酒店前台、加油站等高频使用场景。',
 'Multi-spectral detector with UV/MG/IR/multi-dimensional detection. 0.3s fast authentication for high-frequency use.',
 '/uploads/vd-200.svg', '$85 - $150',
 '{"检测方式":"UV/MG/IR/WM/MT","检测速度":"<0.3秒","电源":"AC 110V-240V 或 USB","显示":"LED指示灯+蜂鸣器","支持币种":"美元/欧元/人民币","重量":"0.45kg","尺寸":"160×80×75mm"}',
 1, 1),

(9, 3, '智能验钞仪 VD-500', 'Smart Money Authenticator VD-500',
 'AI 智能鉴伪仪，内置深度学习算法，鉴伪准确率 99.9%。支持扫描显示纸币面额、版本信息。5 英寸屏幕实时显示检测结果，可存储检测记录。',
 'AI-powered authenticator with deep learning, 99.9% accuracy. Displays denomination and version info on 5" screen with detection history.',
 '/uploads/vd-500.svg', '$280 - $420',
 '{"检测方式":"UV/MG/IR/CIS/AI","检测速度":"<0.5秒","显示屏":"5英寸IPS触摸屏","支持币种":"50+种","数据存储":"10000条记录","连接方式":"USB/WiFi","电源":"AC 110V-240V","重量":"1.2kg","尺寸":"220×150×90mm"}',
 1, 2),

(10, 3, '便携验钞笔 VP-10', 'Portable UV Money Checker VP-10',
 '口袋大小的紫外验钞笔，一键操作，即照即验。内置可充电锂电池，续航 8 小时。适用于快递员、外卖配送、夜市摊贩等移动场景。',
 'Pocket-sized UV checker with one-click operation. 8-hour battery life, perfect for delivery services and mobile vendors.',
 '/uploads/vp-10.svg', '$8 - $18',
 '{"检测方式":"紫外线+白光","电源":"内置锂电池","续航":"8小时","充电":"Micro USB","重量":"35g","尺寸":"130×25×20mm"}',
 1, 3),

-- 便携点钞机 (11-12)
(11, 4, '便携式点钞机 PC-100', 'Portable Banknote Counter PC-100',
 '轻巧便携，USB 充电，适合外出收款、展会、小型商铺使用。支持批量计数和金额累加。内置锂电池可连续工作 4 小时。',
 'Lightweight and portable with USB charging, batch counting and amount accumulation. 4-hour battery life.',
 '/uploads/pc-100.svg', '$45 - $90',
 '{"点钞速度":"600张/分钟","进钞容量":"100张","鉴伪方式":"UV/IR","电源":"USB/内置锂电池","续航":"4小时","重量":"0.8kg","尺寸":"200×130×85mm"}',
 1, 1),

(12, 4, '折叠式点钞机 PC-50', 'Foldable Money Counter PC-50',
 '超轻便折叠设计，可放入口袋。USB-C 充电，满电可点钞 3000 张。专为上门收款、展会销售、移动办公设计。',
 'Ultra-light foldable design, fits in pocket. USB-C charging, counts 3000 notes per charge.',
 '/uploads/pc-50.svg', '$35 - $65',
 '{"点钞速度":"500张/分钟","进钞容量":"80张","电源":"USB-C/锂电池","满电点钞量":"3000张","折叠尺寸":"100×65×30mm","展开尺寸":"180×65×50mm","重量":"0.35kg"}',
 1, 2),

-- 银行专用设备 (13-15)
(13, 5, '捆钞机 BT-200', 'Banknote Strapping Machine BT-200',
 '全自动捆钞机，支持 100 张/捆自动打捆。热压封口，牢固美观。符合央行捆扎标准，可打印捆扎标签。适合银行、押运公司使用。',
 'Automatic strapping machine, 100 notes/bundle. Heat-sealing, compliant with central bank standards, label printing.',
 '/uploads/bt-200.svg', '$680 - $980',
 '{"捆扎速度":"8秒/捆","每捆数量":"100张（可调）","捆扎方式":"热压封口","纸带宽度":"20mm","显示屏":"LED","电源":"AC 220V","重量":"18kg","尺寸":"350×280×320mm"}',
 1, 1),

(14, 5, '复点机 RT-300', 'Recounting Machine RT-300',
 '银行柜台专用复点机，支持预置数复点、累加复点。点钞速度可调，噪音低于 60 分贝。配防盗锁功能，防止数据篡改。',
 'Bank counter recounting machine with preset counting, adjustable speed, anti-tampering lock. Noise below 60dB.',
 '/uploads/rt-300.svg', '$420 - $650',
 '{"点钞速度":"800/1000/1200张/分钟可调","进钞容量":"300张","鉴伪方式":"UV/MG/IR","预置数":"1-9999","噪音":"<60dB","防盗锁":"支持","电源":"AC 110V-240V","重量":"6.8kg","尺寸":"300×260×200mm"}',
 1, 2),

(15, 5, '扎把机 ZB-100', 'Note Binding Machine ZB-100',
 '自动扎把机，每把 100 张纸币自动捆扎。弹性皮带进钞，不伤纸币。可调节松紧度，适配不同新旧程度纸币。操作简单，一键完成。',
 'Automatic note binding, 100 notes per strap. Elastic belt feed, adjustable tension for different note conditions.',
 '/uploads/zb-100.svg', '$150 - $280',
 '{"扎把速度":"3秒/把","每把数量":"100张（可调）","扎带材质":"纸带/塑料带","电源":"AC 110V-240V","重量":"5.5kg","尺寸":"250×200×180mm"}',
 1, 3);

-- ===== Sample Inquiries =====
INSERT INTO inquiry (id, product_id, company_name, contact_name, email, phone, message, is_read) VALUES
(1, 1, 'Global Cash Solutions Ltd.', 'Michael Brown', 'michael@globalcash.com', '+1-212-555-0198',
 'We are interested in the BC-3600 Mixed Denomination Counter. We need 200 units for our chain of retail stores across North America. Please provide wholesale pricing and lead time.', 0),
(2, 5, 'African Banking Corp.', 'Sarah Williams', 'sarah@afribank.co.za', '+27-11-555-0123',
 'Looking for professional currency sorters for our branch network. We need machines that can handle South African Rand and US Dollars. Can you provide specifications and a sample unit?', 1),
(3, 8, 'Dubai Exchange House', 'Ahmed Hassan', 'ahmed@dubaiexchange.ae', '+971-4-555-8899',
 'Need 500 units of counterfeit detection machines for our exchange counters. Quick delivery to Dubai preferred.', 0),
(4, 3, 'Tokyo Mart Co.', 'Tanaka Yuki', 'tanaka@tokyomart.jp', '+81-3-5555-1234',
 '需要 BC-2200 桌面型点钞机 50 台，请报 CIF 东京价格。', 0),
(5, 11, 'Ahmed Trading LLC', 'Omar Ali', 'omar@ahmedtrading.ae', '+971-4-333-2211',
 'Interested in portable counters for our mobile sales team. Need 100 units PC-100. What is your MOQ and best price?', 1);

-- ===== Articles (6 articles) =====
INSERT INTO article (id, title_cn, title_en, content_cn, content_en, cover_image, status) VALUES
(1, '如何选择适合您企业的点钞机', 'How to Choose the Right Money Counter for Your Business',
 '在现金处理量大的企业中，一台高效的点钞机是必不可少的工具。本文将从点钞速度、鉴伪能力、面额识别等方面，帮助您选择最适合的机型。

## 一、根据使用场景选择

**银行和金融机构**：建议选择专业清分机（如 CS-800），支持多面额清分、ATM 配钞、残币识别。

**商超和零售**：推荐混合点钞机（如 BC-3600），支持混合面额点钞、自动计算总金额。

**小型商铺和移动销售**：便携式点钞机（如 PC-100）即可满足需求。

## 二、购买建议

1. 优先考虑鉴伪能力
2. 关注售后保障
3. 实际需求匹配
4. 批量采购议价',
 'In businesses with high cash processing volumes, an efficient money counter is essential. This article helps you choose the most suitable machine for banks, retail, small shops, and more.',
 '/uploads/article-1.svg', 1),

(2, '2024年点钞机行业趋势报告', '2024 Banknote Counter Industry Trends Report',
 '随着人工智能和图像识别技术的发展，点钞机行业正在经历重大变革。

## 主要趋势

1. **AI 智能鉴伪**：鉴伪准确率从 99% 提升至 99.99%
2. **多币种全球化**：支持 32 种以上货币识别
3. **云端管理**：支持 WiFi/4G 联网远程管理
4. **移动化**：折叠式、口袋式验钞设备快速增长

## 市场数据

- 全球市场规模：28 亿美元
- 年复合增长率：5.2%
- 中国出口量占全球：65%',
 'AI and image recognition are transforming the banknote counter industry. Key trends include AI-powered counterfeit detection, multi-currency support, and cloud connectivity.',
 '/uploads/article-2.svg', 1),

(3, 'TradePlus 与非洲银行集团签署战略合作协议', 'TradePlus Signs Strategic Partnership with African Banking Corp.',
 '2024 年 3 月，TradePlus 与南非 African Banking Corp. 正式签署战略合作协议，为其在非洲 12 个国家的 200 多家分支机构提供全套现金处理设备。

## 合作内容

**首批订单**：500 台 CS-800 专业清分机，200 台 BC-3600 混合点钞机。

**定制化服务**：针对非洲市场需求，定制了南非兰特、美元、欧元等多币种识别方案。

**售后保障**：在约翰内斯堡设立区域服务中心，提供本地化技术支持。

## 客户评价

"TradePlus 的产品在鉴伪准确率和多币种支持方面表现优异，完全满足我们跨境业务的需求。" —— African Banking Corp. 首席运营官 David Moyo',
 'In March 2024, TradePlus signed a strategic partnership with African Banking Corp. to provide complete cash processing equipment for over 200 branches across 12 African countries. Initial order includes 500 CS-800 currency sorters and 200 BC-3600 counters.',
 '/uploads/article-3.svg', 1),

(4, 'TradePlus 与迪拜汇兑公司签署谅解备忘录', 'TradePlus Signs MOU with Dubai Exchange House',
 '2024 年 5 月，TradePlus 与迪拜最大的汇兑公司之一 Dubai Exchange House 签署谅解备忘录（MOU），双方将在现金处理设备采购和技术合作方面展开深入合作。

## 合作亮点

**设备采购**：Dubai Exchange House 将在其阿联酋境内的 80 个网点部署 VD-200 专业验钞机和 BC-5200 高速混合点钞机。

**技术合作**：双方将联合开发针对中东市场的阿联酋迪拉姆、沙特里亚尔专项鉴伪方案。

**首批交付**：300 台 VD-200 已于 2024 年 6 月完成交付，客户反馈良好。

## 市场意义

中东地区是全球现金交易最活跃的区域之一。此次合作标志着 TradePlus 在中东市场的重大突破，预计将带动该区域年销售额增长 30%。',
 'TradePlus signed a MOU with Dubai Exchange House for cash processing equipment deployment across 80 outlets in the UAE, including VD-200 detectors and BC-5200 counters.',
 '/uploads/article-4.svg', 1),

(5, 'TradePlus 发布新一代 AI 鉴伪技术', 'TradePlus Unveils Next-Gen AI Counterfeit Detection Technology',
 '2024 年 7 月，TradePlus 研发团队正式发布新一代 AI 鉴伪技术，将鉴伪准确率提升至 99.99%，领先行业水平。

## 技术突破

**深度学习算法**：基于超过 1000 万张纸币样本训练，可识别所有已知假币特征。

**实时学习能力**：支持在线更新假币特征库，无需更换硬件即可应对新型假币。

**多维度检测**：融合紫外、磁性、红外、CIS 全幅扫描等 7 种检测方式。

## 应用产品

新技术已应用于以下产品：
- BC-8800 全自动点钞机
- CS-1200 高速清分机
- VD-500 智能鉴伪仪

## 测试结果

在第三方检测机构的盲测中，新技术对新型拼接币、变造币的识别率达到 100%，误报率低于 0.001%。',
 'TradePlus unveiled next-generation AI counterfeit detection technology with 99.99% accuracy, based on deep learning with 10M+ training samples. Applied to BC-8800, CS-1200, and VD-500.',
 '/uploads/article-5.svg', 1),

(6, 'TradePlus 东南亚市场扩张：新增 10 家经销商', 'TradePlus Expands to Southeast Asia with 10 New Distributors',
 '2024 年 8 月，TradePlus 宣布在东南亚市场取得重大进展，与越南、泰国、印尼、菲律宾、马来西亚 5 个国家的 10 家经销商签署合作协议。

## 市场布局

**越南（3 家）**：覆盖胡志明市、河内、岘港三大城市，重点推广 BC-3600 和 BC-5200。

**泰国（2 家）**：与曼谷两家银行设备供应商合作，主推 CS-400 清分机和 VD-200 验钞机。

**印尼（2 家）**：针对印尼庞大的中小商户市场，推广 PC-100 便携点钞机。

**菲律宾（2 家）**：与马尼拉的金融服务公司合作，提供全套现金处理解决方案。

**马来西亚（1 家）**：与吉隆坡的银行设备分销商合作，覆盖银行和零售渠道。

## 预期目标

东南亚市场预计 2025 年将贡献 500 万美元销售额，成为 TradePlus 第三大海外市场。',
 'TradePlus expands to Southeast Asia with 10 new distributors across Vietnam, Thailand, Indonesia, Philippines, and Malaysia, targeting $5M in sales for 2025.',
 '/uploads/article-6.svg', 1),

(7, 'TradePlus 亮相 2024 香港环球金融科技展', 'TradePlus Showcases at Hong Kong Global FinTech Expo 2024',
 '2024 年 9 月，TradePlus 携全线产品亮相 2024 香港环球金融科技展，展示了最新 AI 鉴伪技术、高速清分机和智能捆钞系统，吸引了来自 40 多个国家的数千名专业观众。

## 展会亮点

**新品首发**：CS-1200 高速清分机首次面向国际市场展出，现场演示每分钟 1200 张纸币的清分速度，获得一致好评。

**技术展示**：展示了最新 AI 鉴伪技术的实际应用效果，包括对拼接币、变造币的识别能力，准确率达 99.99%。

**国际合作**：与来自中东、南美、非洲等地区的 20 余家潜在经销商进行了深入洽谈。

## 客户反馈

"TradePlus 的 AI 鉴伪技术令人印象深刻，我们在现场测试了多种假币样本，全部被准确识别。" —— 马来西亚银行协会技术顾问 Lim Wei Ming',
 'TradePlus showcased its full product line at the 2024 Hong Kong Global FinTech Expo, featuring AI counterfeit detection, high-speed currency sorters, and smart banknote strapping systems. CS-1200 made its international debut with live demonstrations attracting thousands of visitors from 40+ countries.',
 '/uploads/article-7.svg', 1),

(8, 'TradePlus 荣获"2024 年度最佳现金管理解决方案"大奖', 'TradePlus Wins "Best Cash Management Solution 2024" Award',
 '2024 年 10 月，TradePlus 在国际金融技术大奖（IFTA）颁奖典礼上荣获"2024 年度最佳现金管理解决方案"大奖，表彰其在智能现金处理设备领域的卓越创新。

## 获奖理由

**技术创新**：AI 鉴伪技术将假币识别准确率提升至 99.99%，领先行业标准。

**全球覆盖**：产品已覆盖全球 60 多个国家和地区，服务超过 5000 家企业客户。

**客户满意度**：连续三年客户满意度超过 98%。

## 行业影响

TradePlus 的产品已被多家中央银行和大型商业银行采用，在提升现金处理效率、降低运营成本方面表现突出。

## CEO 感言

"这个奖项是对我们研发团队多年努力的认可。我们将继续投入创新，为全球客户提供更智能、更可靠的现金处理解决方案。" —— TradePlus CEO Chen Wei',
 'TradePlus won the "Best Cash Management Solution 2024" award at the International Financial Technology Awards (IFTA), recognizing its outstanding innovation in intelligent cash processing equipment including AI counterfeit detection technology and global coverage across 60+ countries.',
 '/uploads/article-8.svg', 1),

(9, 'TradePlus 与欧洲支付解决方案提供商 EuroPay 签署战略合作', 'TradePlus Signs Strategic Partnership with European Payment Solutions Provider EuroPay',
 '2024 年 11 月，TradePlus 与欧洲领先的支付解决方案提供商 EuroPay Solutions GmbH 正式签署战略合作协议，共同开拓欧洲现金处理市场。

## 合作详情

**分销网络**：EuroPay 将作为 TradePlus 在欧洲 15 个国家的独家分销商，覆盖德国、法国、意大利、西班牙、荷兰等主要市场。

**产品本地化**：双方将合作开发符合欧洲央行（ECB）标准的欧元专项鉴伪方案，适配欧洲市场的纸币处理需求。

**首批订单**：800 台 BC-3600 混合点钞机、300 台 CS-800 银行专用清分机，总价值约 120 万欧元。

## 市场前景

欧洲现金交易量依然庞大，特别是在德国、奥地利等国家，现金支付占比超过 50%。此次合作预计将为 TradePlus 带来年销售额 500 万欧元。

## 合作伙伴评价

"TradePlus 的产品在技术水平、性价比和服务响应方面均优于欧洲本土品牌，我们对其在欧洲市场的表现充满信心。" —— EuroPay Solutions CEO Markus Schneider',
 'TradePlus signed a strategic partnership with EuroPay Solutions GmbH, a leading European payment solutions provider, to distribute TradePlus products across 15 European countries. Initial order includes 800 BC-3600 and 300 CS-800 units worth approximately €1.2 million.',
 '/uploads/article-9.svg', 1);

-- ===== Sample Banners =====
INSERT INTO banner (id, title_cn, title_en, subtitle_cn, subtitle_en, image, link_url, sort_order, status) VALUES
(1, '智能点钞，精准高效', 'Smart Counting, Precise & Efficient',
 '专业银行级点钞机，为全球企业服务', 'Professional Bank-Grade Counters for Global Business',
 '/uploads/banner-1.svg', '/products', 1, 1),
(2, '新品上市：BC-5200 高速混合点钞机', 'New: BC-5200 High Speed Mixed Counter',
 '1200张/分钟，支持32种货币识别，WiFi联网', '1200 notes/min, 32 currencies, WiFi enabled',
 '/uploads/banner-2.svg', '/products/2', 2, 1),
(3, '批量采购享专属优惠', 'Bulk Order Special Offer',
 '50台起订，最高享15%折扣', 'Order 50+ units, save up to 15%',
 '/uploads/banner-3.svg', '/contact', 3, 1);
