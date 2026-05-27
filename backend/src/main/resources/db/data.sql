-- Default admin user (password: admin123, BCrypt encoded)
INSERT OR IGNORE INTO sys_user (username, password, role)
VALUES ('admin', '$2a$10$N.ZOn6gh8MH.YjMBqBN6e.FH6AIXSjIKxFKCjMPSQJfOjF9xCBOwS', 'admin');

-- Sample categories
INSERT OR IGNORE INTO product_category (id, name_cn, name_en, sort_order) VALUES
(1, '电子产品', 'Electronics', 1),
(2, '机械设备', 'Machinery', 2),
(3, '家居用品', 'Home & Garden', 3),
(4, '服装配饰', 'Fashion & Accessories', 4);

-- Sample products
INSERT OR IGNORE INTO product (id, category_id, name_cn, name_en, description_cn, description_en, main_image, price, specifications, status, sort_order) VALUES
(1, 1, '智能蓝牙音箱', 'Smart Bluetooth Speaker', '高品质无线蓝牙音箱，支持多种设备连接，360度环绕立体声，超长续航。', 'High-quality wireless Bluetooth speaker with multi-device connectivity, 360-degree surround sound, and extra-long battery life.', '/uploads/sample-speaker.jpg', '$29.99 - $89.99', '{"Material":"ABS Plastic","Battery":"4000mAh","Bluetooth":"5.0","Weight":"650g"}', 1, 1),
(2, 1, '便携式充电宝', 'Portable Power Bank', '大容量移动电源，支持快充，轻薄便携，适用于各种智能设备。', 'Large capacity power bank with fast charging support, slim and portable design, compatible with all smart devices.', '/uploads/sample-powerbank.jpg', '$15.99 - $45.99', '{"Capacity":"20000mAh","Output":"USB-A + USB-C","Weight":"350g","Fast Charge":"PD 20W"}', 1, 2),
(3, 2, '工业级切割机', 'Industrial Cutting Machine', '精密工业切割设备，适用于金属、木材、塑料等多种材料加工。', 'Precision industrial cutting equipment suitable for metal, wood, plastic and other material processing.', '/uploads/sample-cutter.jpg', 'Contact for price', '{"Power":"2200W","Cutting Depth":"65mm","Speed":"5000 RPM","Weight":"8.5kg"}', 1, 1),
(4, 3, '现代简约台灯', 'Modern Minimalist Desk Lamp', 'LED护眼台灯，三档调光，USB充电，现代简约设计，适用于办公和家居。', 'LED eye-protection desk lamp with 3-level dimming, USB charging, modern minimalist design for office and home.', '/uploads/sample-lamp.jpg', '$12.99 - $29.99', '{"LED":"12W","Color Temp":"3000-6500K","Material":"Aluminum + ABS","Height":"42cm"}', 1, 1),
(5, 4, '真皮商务手表', 'Leather Business Watch', '经典真皮表带商务手表，石英机芯，防水设计，简约大气。', 'Classic leather strap business watch with quartz movement, water-resistant design, simple and elegant.', '/uploads/sample-watch.jpg', '$35.99 - $79.99', '{"Movement":"Quartz","Water Resistance":"3ATM","Case Diameter":"42mm","Band Material":"Genuine Leather"}', 1, 1);

-- Sample inquiries
INSERT OR IGNORE INTO inquiry (id, product_id, company_name, contact_name, email, phone, message, is_read) VALUES
(1, 1, 'TechCorp Inc.', 'John Smith', 'john@techcorp.com', '+1-555-0123', 'Interested in ordering 500 units of the Smart Bluetooth Speaker. Please send me a quotation with bulk pricing.', 0),
(2, 3, 'BuildRight Ltd.', 'Sarah Johnson', 'sarah@buildright.co.uk', '+44-20-7946-0958', 'We need an industrial cutting machine for our factory. Can you provide specifications and shipping to UK?', 1);
