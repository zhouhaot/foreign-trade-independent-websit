package com.tradesite.mapper;

import com.tradesite.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface ArticleMapper {
    List<Article> findAll();
    List<Article> findPublished(@Param("limit") int limit);
    Article findById(@Param("id") Integer id);
    int count();
    int insert(Article article);
    int update(Article article);
    int deleteById(@Param("id") Integer id);
}
