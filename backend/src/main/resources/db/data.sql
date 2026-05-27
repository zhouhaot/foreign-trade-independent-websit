-- Default admin user (password: admin123, BCrypt encoded)
INSERT OR IGNORE INTO sys_user (username, password, role)
VALUES ('admin', '$2a$10$N.ZOn6gh8MH.YjMBqBN6e.FH6AIXSjIKxFKCjMPSQJfOjF9xCBOwS', 'admin');

-- ===== Categories: Money Counting Machines =====
INSERT OR IGNORE INTO product_category (id, name_cn, name_en, sort_order) VALUES
(1, '混合点钞机', 'Mixed Denomination Counters', 1),
(2, '清分机', 'Currency Sorters', 2),
(3, '验钞机', 'Counterfeit Detectors', 3),
(4, '便携点钞机', 'Portable Counters', 4);

-- ===== Products: Banknote Counting Machines =====
INSERT OR IGNORE INTO product (id, category_id, name_cn, name_en, description_cn, description_en, main_image, price, specifications, status, sort_order) VALUES
(1, 1, '智能混合点钞机 BC-3600', 'Smart Mixed Denomination Counter BC-3600',
 '支持混合面额点钞、自动识别面额、累计金额计算。配备高清触摸屏，支持多币种识别，适合银行、商超、财务等场景使用。',
 'Supports mixed denomination counting, automatic denomination recognition, and cumulative amount calculation. Features HD touchscreen, multi-currency recognition, suitable for banks, supermarkets, and finance departments.',
 '/uploads/bc-3600.jpg', '$580 - $780',
 '{"Counting Speed":"1000 notes/min","Hopper Capacity":"500 notes","Stacker Capacity":"200 notes","Detection":"UV/MG/IR/MT/3D","Display":"4.3 inch Touchscreen","Currency":"USD/EUR/GBP/CNY","Power":"AC 110V-240V","Weight":"6.5 kg","Dimensions":"310x275x195mm"}',
 1, 1),

(2, 1, '高速混合点钞机 BC-5200', 'High Speed Mixed Counter BC-5200',
 '采用先进图像识别技术，支持混合面额高速清点，自动鉴伪、分版、计算总金额。大容量进钞斗，适合高频率使用场景。',
 'Advanced image recognition technology, supports high-speed mixed denomination counting with automatic counterfeit detection, sorting, and total amount calculation. Large capacity hopper for high-frequency use.',
 '/uploads/bc-5200.jpg', '$850 - $1200',
 '{"Counting Speed":"1200 notes/min","Hopper Capacity":"800 notes","Stacker Capacity":"200 notes","Detection":"UV/MG/IR/MT/CIS","Display":"5 inch Touchscreen","Currency":"Multi-currency (up to 32)","Connectivity":"USB/LAN","Power":"AC 110V-240V","Weight":"8.2 kg","Dimensions":"350x300x210mm"}',
 1, 2),

(3, 2, '银行专用清分机 CS-800', 'Bank Grade Currency Sorter CS-800',
 '专业级银行清分机，支持多面额同时清分、ATM配钞、残币识别。符合央行清分标准，可对接银行核心系统。',
 'Professional bank-grade currency sorter with multi-denomination sorting, ATM dispensing, and damaged note recognition. Compliant with central bank clearing standards.',
 '/uploads/cs-800.jpg', '$2500 - $3800',
 '{"Counting Speed":"800 notes/min","Hopper Capacity":"1000 notes","Output Bins":"4 bins","Detection":"UV/MG/IR/CIS/3D/MR","Display":"7 inch Touchscreen","Serial Number":"OCR Recognition","Connectivity":"USB/LAN/RS232","Power":"AC 220V","Weight":"35 kg","Dimensions":"550x400x380mm"}',
 1, 1),

(4, 2, '桌面清分机 CS-400', 'Desktop Currency Sorter CS-400',
 '紧凑型桌面清分机，支持面额分拣、面向统一、真假鉴别。适合中小型金融机构、零售企业使用。',
 'Compact desktop sorter supporting denomination sorting, orientation unification, and counterfeit detection. Ideal for small-medium financial institutions and retail businesses.',
 '/uploads/cs-400.jpg', '$1200 - $1800',
 '{"Counting Speed":"600 notes/min","Hopper Capacity":"300 notes","Output Bins":"2 bins","Detection":"UV/MG/IR/CIS","Display":"3.5 inch LCD","Serial Number":"Optional","Power":"AC 110V-240V","Weight":"12 kg","Dimensions":"380x280x250mm"}',
 1, 2),

(5, 3, '专业验钞机 VD-200', 'Professional Counterfeit Detector VD-200',
 '多光谱验钞机，支持紫外、磁性、红外、多维检测。快速鉴别真伪，适合商超收银、酒店前台等场景。',
 'Multi-spectral counterfeit detector with UV, magnetic, infrared, and multi-dimensional detection. Fast authentication for supermarket checkout and hotel front desk.',
 '/uploads/vd-200.jpg', '$85 - $150',
 '{"Detection Methods":"UV/MG/IR/WM/MT","Detection Speed":"<0.5 seconds","Power":"AC 110V-240V or USB","Display":"LED indicator + buzzer","Weight":"0.45 kg","Dimensions":"160x80x75mm"}',
 1, 1),

(6, 4, '便携式点钞机 PC-100', 'Portable Banknote Counter PC-100',
 '轻巧便携，USB充电，适合外出收款、展会、小型商铺使用。支持批量计数和金额累加。',
 'Lightweight and portable with USB charging, ideal for outdoor collection, exhibitions, and small shops. Supports batch counting and amount accumulation.',
 '/uploads/pc-100.jpg', '$45 - $90',
 '{"Counting Speed":"600 notes/min","Hopper Capacity":"100 notes","Detection":"UV/IR","Power":"USB/Rechargeable Battery","Battery Life":"4 hours","Weight":"0.8 kg","Dimensions":"200x130x85mm"}',
 1, 1),

(7, 4, '手持验钞仪 HV-50', 'Handheld Money Detector HV-50',
 '口袋大小的手持验钞仪，紫外+白光双模式检测，内置可充电锂电池。适用于移动销售、外卖配送等场景。',
 'Pocket-sized handheld detector with UV + white light dual-mode detection and rechargeable lithium battery. Perfect for mobile sales and delivery services.',
 '/uploads/hv-50.jpg', '$12 - $25',
 '{"Detection":"UV + White Light","Power":"Rechargeable Li-battery","Battery Life":"8 hours","Weight":"0.05 kg","Dimensions":"120x30x20mm"}',
 1, 2);

-- ===== Sample Inquiries =====
INSERT OR IGNORE INTO inquiry (id, product_id, company_name, contact_name, email, phone, message, is_read) VALUES
(1, 1, 'Global Cash Solutions Ltd.', 'Michael Brown', 'michael@globalcash.com', '+1-212-555-0198',
 'We are interested in the BC-3600 Mixed Denomination Counter. We need 200 units for our chain of retail stores across North America. Please provide wholesale pricing and lead time.', 0),
(2, 3, 'African Banking Corp.', 'Sarah Williams', 'sarah@afribank.co.za', '+27-11-555-0123',
 'Looking for professional currency sorters for our branch network. We need machines that can handle South African Rand and US Dollars. Can you provide specifications and a sample unit?', 1),
(3, 5, 'Dubai Exchange House', 'Ahmed Hassan', 'ahmed@dubaiexchange.ae', '+971-4-555-8899',
 'Need 500 units of counterfeit detection machines for our exchange counters. Quick delivery to Dubai preferred.', 0);

-- ===== Sample Articles =====
INSERT OR IGNORE INTO article (id, title_cn, title_en, content_cn, content_en, cover_image, status) VALUES
(1, '如何选择适合您企业的点钞机', 'How to Choose the Right Money Counter for Your Business',
 '在现金处理量大的企业中，一台高效的点钞机是必不可少的工具。本文将从点钞速度、鉴伪能力、面额识别等方面，帮助您选择最适合的机型。

## 一、根据使用场景选择

**银行和金融机构**：建议选择专业清分机（如 CS-800），支持多面额清分、ATM 配钞、残币识别。

**商超和零售**：推荐混合点钞机（如 BC-3600），支持混合面额点钞、自动计算总金额。

**小型商铺和移动销售**：便携式点钞机（如 PC-100）即可满足需求。

## 二、关键参数对比

| 参数 | 入门级 | 中端 | 专业级 |
|------|--------|------|--------|
| 点钞速度 | 600张/分 | 1000张/分 | 1200+张/分 |
| 进钞容量 | 100张 | 500张 | 800+张 |
| 鉴伪方式 | UV | UV/MG/IR | UV/MG/IR/CIS/3D |
| 面额识别 | 不支持 | 支持 | 支持+序列号 |',
 'In businesses with high cash processing volumes, an efficient money counter is an essential tool. This article will help you choose the most suitable machine from the perspectives of counting speed, counterfeit detection capability, and denomination recognition.

## 1. Choose by Use Case

**Banks and Financial Institutions**: Professional currency sorters (like CS-800) are recommended, supporting multi-denomination sorting, ATM dispensing, and damaged note recognition.

**Supermarkets and Retail**: Mixed denomination counters (like BC-3600) are recommended, supporting mixed denomination counting and automatic total calculation.

**Small Shops and Mobile Sales**: Portable counters (like PC-100) can meet the needs.',
 '/uploads/article-1.jpg', 1),

(2, '2024年点钞机行业趋势报告', '2024 Banknote Counter Industry Trends Report',
 '随着人工智能和图像识别技术的发展，点钞机行业正在经历重大变革。本文分析了当前行业趋势和未来发展方向。

## 主要趋势

1. **AI 智能识别**：越来越多的机器采用深度学习算法进行鉴伪，准确率提升至 99.9% 以上。
2. **多币种支持**：全球化贸易推动了对多币种识别能力的需求。
3. **云连接**：新一代机器支持联网，可远程更新货币数据和固件。
4. **环保设计**：低功耗、可回收材料成为新的设计趋势。',
 'With the development of AI and image recognition technology, the banknote counter industry is undergoing significant changes. This article analyzes current industry trends and future development directions.

## Key Trends

1. **AI Smart Recognition**: More machines are adopting deep learning algorithms for counterfeit detection, with accuracy rates exceeding 99.9%.
2. **Multi-currency Support**: Global trade drives demand for multi-currency recognition capability.
3. **Cloud Connectivity**: New-generation machines support networking for remote currency data and firmware updates.
4. **Eco-friendly Design**: Low power consumption and recyclable materials are becoming new design trends.',
 '/uploads/article-2.jpg', 1);

-- ===== Sample Banners =====
INSERT OR IGNORE INTO banner (id, title_cn, title_en, subtitle_cn, subtitle_en, image, link_url, sort_order, status) VALUES
(1, '智能点钞，精准高效', 'Smart Counting, Precise & Efficient',
 '专业银行级点钞机，为全球企业服务', 'Professional Bank-Grade Counters for Global Business',
 '/uploads/banner-1.jpg', '/products', 1, 1),
(2, '新品上市：BC-5200 高速混合点钞机', 'New Arrival: BC-5200 High Speed Counter',
 '1200张/分钟，支持32种货币识别', '1200 notes/min, supports 32 currencies',
 '/uploads/banner-2.jpg', '/products/2', 2, 1);
