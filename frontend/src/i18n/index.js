import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    nav: {
      home: 'Home',
      products: 'Products',
      news: 'News',
      about: 'About Us',
      contact: 'Contact'
    },
    home: {
      hero_title: 'Your Global Trade Partner',
      hero_subtitle: 'Quality products for international markets. Professional sourcing, reliable delivery.',
      hero_cta: 'Explore Products',
      featured: 'Featured Products',
      view_all: 'View All',
      why_title: 'Why Choose TradePlus',
      why_quality: 'Quality Assurance',
      why_quality_desc: 'Every product undergoes strict quality control before shipping.',
      why_delivery: 'Global Delivery',
      why_delivery_desc: 'Reliable logistics partners ensure timely delivery worldwide.',
      why_support: '24/7 Support',
      why_support_desc: 'Our team is always ready to assist with your inquiries.',
      why_price: 'Competitive Price',
      why_price_desc: 'Direct factory pricing for maximum value.'
    },
    products: {
      title: 'Our Products',
      all_categories: 'All',
      no_products: 'No products found',
      contact_for_price: 'Contact for Price',
      view_detail: 'View Details',
      specifications: 'Specifications',
      search_placeholder: 'Search products...'
    },
    news: {
      title: 'News & Insights',
      subtitle: 'Industry news, product updates, and expert insights',
      no_articles: 'No articles yet',
      read_more: 'Read More',
      back: 'Back to News'
    },
    about: {
      title: 'About Us',
      subtitle: 'Your Trusted Partner in Global Trade',
      story_title: 'Our Story',
      story: 'TradePlus is a professional foreign trade company dedicated to connecting quality manufacturers with global buyers. With years of experience in international trade, we provide reliable sourcing, quality assurance, and seamless logistics solutions.',
      mission_title: 'Our Mission',
      mission: 'To bridge the gap between manufacturers and international markets, making global trade accessible and efficient for businesses of all sizes.',
      stats_products: 'Products',
      stats_countries: 'Countries',
      stats_orders: 'Orders Completed',
      stats_years: 'Years Experience'
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'Get in touch with us for any inquiries',
      form_name: 'Your Name *',
      form_email: 'Email Address *',
      form_phone: 'Phone Number',
      form_company: 'Company Name',
      form_product: 'Interested Product',
      form_message: 'Your Message *',
      form_submit: 'Send Inquiry',
      form_sending: 'Sending...',
      success_title: 'Thank You!',
      success_msg: 'Your inquiry has been submitted successfully. We will get back to you within 24 hours.',
      send_another: 'Send Another',
      info_title: 'Contact Information',
      info_email: 'Email',
      info_phone: 'Phone',
      info_address: 'Address',
      info_address_value: '123 Trade Street, Business District, China'
    },
    footer: {
      copyright: '© 2024 TradePlus. All rights reserved.',
      tagline: 'Your trusted partner in global trade.'
    }
  },
  zh: {
    nav: {
      home: '首页',
      products: '产品中心',
      news: '新闻资讯',
      about: '关于我们',
      contact: '联系我们'
    },
    home: {
      hero_title: '您的全球贸易伙伴',
      hero_subtitle: '面向国际市场的优质产品。专业采购，可靠交付。',
      hero_cta: '浏览产品',
      featured: '精选产品',
      view_all: '查看全部',
      why_title: '为什么选择 TradePlus',
      why_quality: '品质保障',
      why_quality_desc: '每件产品在发货前都经过严格的质量检验。',
      why_delivery: '全球配送',
      why_delivery_desc: '可靠的物流合作伙伴确保全球范围内的及时交付。',
      why_support: '全天候服务',
      why_support_desc: '我们的团队随时准备为您解答疑问。',
      why_price: '价格优势',
      why_price_desc: '工厂直供价格，为您创造最大价值。'
    },
    products: {
      title: '产品中心',
      all_categories: '全部',
      no_products: '暂无产品',
      contact_for_price: '询价',
      view_detail: '查看详情',
      specifications: '规格参数',
      search_placeholder: '搜索产品...'
    },
    news: {
      title: '新闻资讯',
      subtitle: '行业动态、产品更新与专业见解',
      no_articles: '暂无文章',
      read_more: '阅读全文',
      back: '返回新闻列表'
    },
    about: {
      title: '关于我们',
      subtitle: '您值得信赖的全球贸易伙伴',
      story_title: '我们的故事',
      story: 'TradePlus 是一家专业的外贸公司，致力于将优质制造商与全球买家连接起来。凭借多年的国际贸易经验，我们提供可靠的采购、质量保证和高效的物流解决方案。',
      mission_title: '我们的使命',
      mission: '搭建制造商与国际市场之间的桥梁，让各种规模的企业都能轻松、高效地进行全球贸易。',
      stats_products: '产品',
      stats_countries: '国家',
      stats_orders: '完成订单',
      stats_years: '年经验'
    },
    contact: {
      title: '联系我们',
      subtitle: '如有任何疑问，请随时与我们联系',
      form_name: '您的姓名 *',
      form_email: '邮箱地址 *',
      form_phone: '电话号码',
      form_company: '公司名称',
      form_product: '感兴趣的产品',
      form_message: '您的留言 *',
      form_submit: '提交询盘',
      form_sending: '提交中...',
      success_title: '感谢您！',
      success_msg: '您的询盘已成功提交，我们将在24小时内回复您。',
      send_another: '继续提交',
      info_title: '联系方式',
      info_email: '邮箱',
      info_phone: '电话',
      info_address: '地址',
      info_address_value: '中国商务区贸易街123号'
    },
    footer: {
      copyright: '© 2024 TradePlus. 保留所有权利。',
      tagline: '您值得信赖的全球贸易伙伴。'
    }
  }
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n
