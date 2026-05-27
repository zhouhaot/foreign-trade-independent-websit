package com.tradesite.service;

import com.tradesite.entity.Article;
import com.tradesite.mapper.ArticleMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ArticleService {

    @Autowired
    private ArticleMapper articleMapper;

    public List<Article> findAll() {
        return articleMapper.findAll();
    }

    public List<Article> findPublished(int limit) {
        return articleMapper.findPublished(limit);
    }

    public Article findById(Integer id) {
        return articleMapper.findById(id);
    }

    public int count() {
        return articleMapper.count();
    }

    public void save(Article article) {
        if (article.getId() == null) {
            articleMapper.insert(article);
        } else {
            articleMapper.update(article);
        }
    }

    public void deleteById(Integer id) {
        articleMapper.deleteById(id);
    }
}
