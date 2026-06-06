package com.delivermap.mobile.models;

import com.google.gson.annotations.SerializedName;

public class Commande {
    @SerializedName("id")
    public int id;

    @SerializedName("reference")
    public String reference;

    @SerializedName("statut")
    public String statut;

    @SerializedName("total_price")
    public double totalPrice;

    @SerializedName("adresse_livraison")
    public String adresseLivraison;

    @SerializedName("mode_paiement")
    public String modePaiement;

    @SerializedName("created_at")
    public String createdAt;

    @SerializedName("client")
    public Object client; // peut être un id ou un objet selon la sérialisation

    @SerializedName("fondateur")
    public Object fondateur;

    /** Traduit le statut en texte lisible */
    public String getStatutLabel() {
        if (statut == null) return "Inconnu";
        switch (statut) {
            case "EN_ATTENTE":    return "En attente";
            case "VALIDEE":       return "Validée";
            case "EN_PREPARATION":return "En préparation";
            case "EN_ROUTE":      return "En route";
            case "LIVREE":        return "Livrée";
            case "ANNULEE":       return "Annulée";
            default:              return statut;
        }
    }

    /** Couleur Material selon le statut */
    public int getStatutColor() {
        if (statut == null) return android.R.color.darker_gray;
        switch (statut) {
            case "EN_ATTENTE":     return android.R.color.holo_orange_light;
            case "VALIDEE":        return android.R.color.holo_blue_light;
            case "EN_PREPARATION": return android.R.color.holo_purple;
            case "EN_ROUTE":       return android.R.color.holo_blue_dark;
            case "LIVREE":         return android.R.color.holo_green_dark;
            case "ANNULEE":        return android.R.color.holo_red_dark;
            default:               return android.R.color.darker_gray;
        }
    }
}
