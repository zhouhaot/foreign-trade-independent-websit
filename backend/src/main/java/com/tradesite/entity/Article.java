package com.tradesite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Article {
    private Integer id;
    private String titleCn;
    private String titleEn;
    private String contentCn;
    private String contentEn;
    private String coverImage;
    private Integer status;
    private LocalDateTime createTime;
}
