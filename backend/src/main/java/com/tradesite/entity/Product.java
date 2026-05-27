package com.tradesite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Product {
    private Integer id;
    private Integer categoryId;
    private String nameCn;
    private String nameEn;
    private String descriptionCn;
    private String descriptionEn;
    private String mainImage;
    private String images;
    private String price;
    private String specifications;
    private Integer status;
    private Integer sortOrder;
    private LocalDateTime createTime;

    // Extra field for display
    private String categoryName;
}
