package com.tradesite.mapper;

import com.tradesite.entity.Banner;
import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface BannerMapper {

    @Select("SELECT * FROM banner ORDER BY sort_order ASC")
    List<Banner> findAll();

    @Select("SELECT * FROM banner WHERE status = 1 ORDER BY sort_order ASC")
    List<Banner> findActive();

    @Select("SELECT * FROM banner WHERE id = #{id}")
    Banner findById(@Param("id") Integer id);

    @Insert("INSERT INTO banner (title_cn, title_en, subtitle_cn, subtitle_en, image, link_url, sort_order, status) VALUES (#{titleCn}, #{titleEn}, #{subtitleCn}, #{subtitleEn}, #{image}, #{linkUrl}, #{sortOrder}, #{status})")
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(Banner banner);

    @Update("UPDATE banner SET title_cn = #{titleCn}, title_en = #{titleEn}, subtitle_cn = #{subtitleCn}, subtitle_en = #{subtitleEn}, image = #{image}, link_url = #{linkUrl}, sort_order = #{sortOrder}, status = #{status} WHERE id = #{id}")
    int update(Banner banner);

    @Delete("DELETE FROM banner WHERE id = #{id}")
    int deleteById(@Param("id") Integer id);
}
