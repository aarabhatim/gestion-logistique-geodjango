package com.delivermap.mobile.adapters;

import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.delivermap.mobile.R;
import com.delivermap.mobile.models.Chauffeur;

import java.util.List;

public class ChauffeurAdapter extends RecyclerView.Adapter<ChauffeurAdapter.VH> {

    private final List<Chauffeur> items;

    public ChauffeurAdapter(List<Chauffeur> items) {
        this.items = items;
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_user, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        Chauffeur c = items.get(position);
        h.tvName.setText(c.getFullName());
        h.tvEmail.setText(c.email != null ? c.email : "");
        h.tvPhone.setText(c.phone != null ? c.phone : "—");
        h.tvBadge.setText(c.isBanned ? "Banni" : "Actif");
        h.tvBadge.setBackgroundColor(c.isBanned
            ? Color.parseColor("#C62828")
            : Color.parseColor("#1565C0"));
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvName, tvEmail, tvPhone, tvBadge;

        VH(View v) {
            super(v);
            tvName  = v.findViewById(R.id.tvName);
            tvEmail = v.findViewById(R.id.tvEmail);
            tvPhone = v.findViewById(R.id.tvPhone);
            tvBadge = v.findViewById(R.id.tvBadge);
        }
    }
}
