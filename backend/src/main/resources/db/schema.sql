-- User table
CREATE TABLE IF NOT EXISTS sys_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product category table
CREATE TABLE IF NOT EXISTS product_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_cn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product table
CREATE TABLE IF NOT EXISTS product (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name_cn TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_cn TEXT,
    description_en TEXT,
    main_image TEXT,
    images TEXT,
    price TEXT DEFAULT 'Contact for price',
    specifications TEXT,
    status INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_category(id)
);

-- Inquiry table
CREATE TABLE IF NOT EXISTS inquiry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(id)
);

-- Article table (News/Blog)
CREATE TABLE IF NOT EXISTS article (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_cn TEXT NOT NULL,
    title_en TEXT NOT NULL,
    content_cn TEXT,
    content_en TEXT,
    cover_image TEXT,
    status INTEGER DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Banner table (Carousel)
CREATE TABLE IF NOT EXISTS banner (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_cn TEXT,
    title_en TEXT,
    subtitle_cn TEXT,
    subtitle_en TEXT,
    image TEXT,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status INTEGER DEFAULT 1,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
);
