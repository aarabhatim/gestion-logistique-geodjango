package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class LoginResponse {
    @SerializedName("access")
    public String access;

    @SerializedName("refresh")
    public String refresh;

    @SerializedName("user")
    public User user;
}
