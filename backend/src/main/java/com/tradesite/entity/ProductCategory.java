package com.tradesite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProductCategory {
    private Integer id;
    private String nameCn;
    private String nameEn;
    private Integer sortOrder;
    private LocalDateTime createTime;
}
