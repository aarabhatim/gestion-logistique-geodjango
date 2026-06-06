package com.delivermap.mobile.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.delivermap.mobile.R;
import com.delivermap.mobile.models.Commande;

import java.util.List;

public class CommandeAdapter extends RecyclerView.Adapter<CommandeAdapter.VH> {

    private final List<Commande> items;

    public CommandeAdapter(List<Commande> items) {
        this.items = items;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_commande, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Commande c = items.get(position);
        h.tvRef.setText(c.reference != null ? c.reference : "#" + c.id);
        h.tvStatut.setText(c.getStatutLabel());
        h.tvTotal.setText(String.format("%.2f MAD", c.totalPrice));
        h.tvAdresse.setText(c.adresseLivraison != null ? c.adresseLivraison : "");

        // Couleur du badge statut
        int color;
        switch (c.statut != null ? c.statut : "") {
            case "LIVREE":         color = Color.parseColor("#2E7D32"); break;
            case "ANNULEE":        color = Color.parseColor("#C62828"); break;
            case "EN_ROUTE":       color = Color.parseColor("#1565C0"); break;
            case "EN_PREPARATION": color = Color.parseColor("#6A1B9A"); break;
            case "VALIDEE":        color = Color.parseColor("#0277BD"); break;
            default:               color = Color.parseColor("#E65100"); break; // EN_ATTENTE
        }
        h.tvStatut.setBackgroundColor(color);
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvRef, tvStatut, tvTotal, tvAdresse;

        VH(View v) {
            super(v);
            tvRef     = v.findViewById(R.id.tvRef);
            tvStatut  = v.findViewById(R.id.tvStatut);
            tvTotal   = v.findViewById(R.id.tvTotal);
            tvAdresse = v.findViewById(R.id.tvAdresse);
        }
    }
}
