package com.tradesite.service;

import com.tradesite.entity.Inquiry;
import com.tradesite.mapper.InquiryMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InquiryService {

    @Autowired
    private InquiryMapper inquiryMapper;

    public List<Inquiry> findAll() {
        return inquiryMapper.findAll();
    }

    public Inquiry findById(Integer id) {
        return inquiryMapper.findById(id);
    }

    public int count() {
        return inquiryMapper.count();
    }

    public int countUnread() {
        return inquiryMapper.countUnread();
    }

    public void save(Inquiry inquiry) {
        inquiryMapper.insert(inquiry);
    }

    public void markAsRead(Integer id) {
        inquiryMapper.markAsRead(id);
    }

    public void deleteById(Integer id) {
        inquiryMapper.deleteById(id);
    }
}
