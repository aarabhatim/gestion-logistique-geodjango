package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Enveloppe pour les réponses paginées du backend Django REST Framework.
 * Format : {"count": N, "next": "...", "previous": "...", "results": [...]}
 */
public class PagedResponse<T> {
    @SerializedName("count")
    public int count;

    @SerializedName("next")
    public String next;

    @SerializedName("previous")
    public String previous;

    @SerializedName("results")
    public List<T> results;
}
