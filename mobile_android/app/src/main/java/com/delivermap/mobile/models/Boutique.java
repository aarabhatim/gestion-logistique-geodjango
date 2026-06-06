package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class Boutique {
    @SerializedName("id")
    public int id;

    @SerializedName("nom_boutique")
    public String nomBoutique;

    @SerializedName("description")
    public String description;

    @SerializedName("categorie")
    public String categorie;

    @SerializedName("adresse")
    public String adresse;

    @SerializedName("ville")
    public String ville;

    @SerializedName("logo")
    public String logo;

    @SerializedName("note_moyenne")
    public double noteMoyenne;

    @SerializedName("nombre_avis")
    public int nombreAvis;

    @SerializedName("is_open")
    public boolean isOpen;

    @SerializedName("frais_livraison_base")
    public double fraisLivraison;

    @SerializedName("commande_minimum")
    public double commandeMinimum;

    public String getCategorieLabel() {
        if (categorie == null) return "";
        switch (categorie) {
            case "SUPERMARCHE":  return "Supermarché";
            case "BOUTIQUE":     return "Mode";
            case "PHARMACIE":    return "Pharmacie";
            case "RESTAURATION": return "Restauration";
            case "ELECTRONIQUE": return "Électronique";
            default:             return "Autre";
        }
    }
}
