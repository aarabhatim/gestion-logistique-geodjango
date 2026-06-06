package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class Chauffeur {
    @SerializedName("id")
    public int id;

    @SerializedName("username")
    public String username;

    @SerializedName("email")
    public String email;

    @SerializedName("first_name")
    public String firstName;

    @SerializedName("last_name")
    public String lastName;

    @SerializedName("phone")
    public String phone;

    @SerializedName("is_banned")
    public boolean isBanned;

    public String getFullName() {
        if (firstName != null && !firstName.isEmpty()) return firstName + " " + lastName;
        return username;
    }
}
