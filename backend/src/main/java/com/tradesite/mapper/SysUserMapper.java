package com.tradesite.mapper;

import com.tradesite.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SysUserMapper {
    SysUser findByUsername(@Param("username") String username);
}
