package com.tradesite;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.tradesite.mapper")
public class TradeSiteApplication {
    public static void main(String[] args) {
        SpringApplication.run(TradeSiteApplication.class, args);
    }
}
