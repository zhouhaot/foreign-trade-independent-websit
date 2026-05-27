package com.tradesite.mapper;

import com.tradesite.entity.Inquiry;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface InquiryMapper {
    List<Inquiry> findAll();
    Inquiry findById(@Param("id") Integer id);
    int count();
    int countUnread();
    int insert(Inquiry inquiry);
    int markAsRead(@Param("id") Integer id);
    int deleteById(@Param("id") Integer id);
}
