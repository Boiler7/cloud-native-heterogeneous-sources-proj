package org.example.models;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import org.springframework.security.core.GrantedAuthority;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
//
//@Entity
//@Table(name = "role", schema = "auth")
//public class Role implements GrantedAuthority {
//
//    @Id
//    @GeneratedValue(strategy= GenerationType.AUTO)
//    @Column(name="role_id")
//    private Integer roleId;
//
//    private String authority;
//
//    public Role(){
//        super();
//    }
//
//    public Role(String authority){
//        this.authority = authority;
//    }
//
//    public Role(Integer roleId, String authority){
//        this.roleId = roleId;
//        this.authority = authority;
//    }
//
//    @Override
//    public String getAuthority() {
//        // TODO Auto-generated method stub
//        return this.authority;
//    }
//
//    public void setAuthority(String authority){
//        this.authority = authority;
//    }
//
//    public Integer getRoleId(){
//        return this.roleId;
//    }
//
//    public void setRoleId(Integer roleId){
//        this.roleId = roleId;
//    }
//}
