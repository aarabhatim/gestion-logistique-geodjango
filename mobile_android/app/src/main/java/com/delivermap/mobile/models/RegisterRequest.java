package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class RegisterRequest {
    @SerializedName("username")
    public String username;

    @SerializedName("email")
    public String email;

    @SerializedName("password")
    public String password;

    @SerializedName("first_name")
    public String firstName;

    @SerializedName("last_name")
    public String lastName;

    @SerializedName("phone")
    public String phone;

    @SerializedName("role")
    public String role; // "CLIENT" par défaut

    public RegisterRequest(String username, String email, String password,
                           String firstName, String lastName, String phone) {
        this.username  = username;
        this.email     = email;
        this.password  = password;
        this.firstName = firstName;
        this.lastName  = lastName;
        this.phone     = phone;
        this.role      = "CLIENT";
    }
}
