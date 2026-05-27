package com.tradesite.mapper;

import com.tradesite.entity.Banner;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface BannerMapper {
    List<Banner> findAll();
    List<Banner> findActive();
    Banner findById(@Param("id") Integer id);
    int insert(Banner banner);
    int update(Banner banner);
    int deleteById(@Param("id") Integer id);
}
