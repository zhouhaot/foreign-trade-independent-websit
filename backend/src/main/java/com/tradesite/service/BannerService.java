package com.tradesite.service;

import com.tradesite.entity.Banner;
import com.tradesite.mapper.BannerMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BannerService {

    @Autowired
    private BannerMapper bannerMapper;

    public List<Banner> findAll() {
        return bannerMapper.findAll();
    }

    public List<Banner> findActive() {
        return bannerMapper.findActive();
    }

    public Banner findById(Integer id) {
        return bannerMapper.findById(id);
    }

    public void save(Banner banner) {
        if (banner.getId() == null) {
            bannerMapper.insert(banner);
        } else {
            bannerMapper.update(banner);
        }
    }

    public void deleteById(Integer id) {
        bannerMapper.deleteById(id);
    }
}
