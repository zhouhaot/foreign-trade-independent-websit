package com.tradesite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Banner {
    private Integer id;
    private String titleCn;
    private String titleEn;
    private String subtitleCn;
    private String subtitleEn;
    private String image;
    private String linkUrl;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createTime;
}
