package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class User {
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

    @SerializedName("role")
    public String role;

    @SerializedName("phone")
    public String phone;

    @SerializedName("is_banned")
    public boolean isBanned;

    @SerializedName("is_staff")
    public boolean isStaff;

    @SerializedName("is_superuser")
    public boolean isSuperuser;

    /**
     * Retourne le rôle effectif : si l'utilisateur est staff/superuser Django
     * mais que son role est resté "CLIENT" par défaut, on le traite comme ADMIN.
     */
    public String getEffectiveRole() {
        if ("ADMIN".equals(role)) return "ADMIN";
        if (isStaff || isSuperuser) return "ADMIN";
        return role != null ? role : "CLIENT";
    }

    public String getFullName() {
        if (firstName != null && lastName != null && !firstName.isEmpty()) {
            return firstName + " " + lastName;
        }
        return username;
    }
}
