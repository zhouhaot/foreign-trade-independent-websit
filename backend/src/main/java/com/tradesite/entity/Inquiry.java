package com.tradesite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Inquiry {
    private Integer id;
    private Integer productId;
    private String companyName;
    private String contactName;
    private String email;
    private String phone;
    private String message;
    private Integer isRead;
    private LocalDateTime createTime;

    // Extra fields for display
    private String productName;
}
