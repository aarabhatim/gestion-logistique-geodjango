/**
 * Utilitaire d'export CSV — DeliverMap
 * Usage :
 *   exportCsv({ data: rows, columns: [{label, key, format}], filename: 'commandes' })
 */

/**
 * @param {object} options
 * @param {Array<object>} options.data        — tableau de lignes
 * @param {Array<{label:string, key:string, format?:function}>} options.columns — colonnes
 * @param {string} options.filename           — nom du fichier (sans extension)
 */
export function exportCsv({ data, columns, filename = 'export' }) {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  // En-tête
  const header = columns.map(c => `"${c.label}"`).join(';');

  // Lignes
  const rows = data.map(row =>
    columns.map(c => {
      const raw = c.key.split('.').reduce((o, k) => (o ? o[k] : ''), row);
      const val = c.format ? c.format(raw, row) : (raw ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';')
  );

  const csvContent = '﻿' + [header, ...rows].join('\r\n'); // BOM UTF-8 pour Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Colonnes prédéfinies par entité */
export const CSV_COLUMNS = {
  commandes: [
    { label: 'Référence',       key: 'reference' },
    { label: 'Statut',          key: 'statut' },
    { label: 'Client',          key: 'client_detail.prenom', format: (v, r) => `${r.client_detail?.prenom || ''} ${r.client_detail?.nom || ''}`.trim() },
    { label: 'Boutique',        key: 'fondateur_detail.nom_boutique' },
    { label: 'Adresse',         key: 'adresse_livraison' },
    { label: 'Montant (MAD)',   key: 'montant_total', format: v => parseFloat(v || 0).toFixed(2) },
    { label: 'Date création',   key: 'created_at', format: v => v ? new Date(v).toLocaleString(undefined) : '' },
    { label: 'Livreur',         key: 'transporteur_detail.prenom', format: (v, r) => `${r.transporteur_detail?.prenom || ''} ${r.transporteur_detail?.nom || ''}`.trim() },
  ],
  clients: [
    { label: 'Prénom',          key: 'prenom' },
    { label: 'Nom',             key: 'nom' },
    { label: 'Email',           key: 'email' },
    { label: 'Téléphone',       key: 'telephone' },
    { label: 'Ville',           key: 'ville' },
    { label: 'Commandes',       key: 'nb_commandes' },
    { label: 'Total dépensé',   key: 'total_depense', format: v => parseFloat(v || 0).toFixed(2) },
    { label: 'Inscription',     key: 'date_joined', format: v => v ? new Date(v).toLocaleDateString(undefined) : '' },
  ],
  transporteurs: [
    { label: 'Prénom',          key: 'prenom' },
    { label: 'Nom',             key: 'nom' },
    { label: 'Email',           key: 'email' },
    { label: 'Téléphone',       key: 'telephone' },
    { label: 'Véhicule',        key: 'vehicule' },
    { label: 'Score',           key: 'score' },
    { label: 'Statut',          key: 'statut' },
    { label: 'Livraisons',      key: 'nb_livraisons' },
  ],
  incidents: [
    { label: 'ID',              key: 'id' },
    { label: 'Type',            key: 'type_incident' },
    { label: 'Statut',          key: 'statut' },
    { label: 'Priorité',        key: 'priorite' },
    { label: 'Description',     key: 'description' },
    { label: 'Commande',        key: 'commande_reference' },
    { label: 'Signalé par',     key: 'signale_par_detail.prenom', format: (v, r) => `${r.signale_par_detail?.prenom || ''} ${r.signale_par_detail?.nom || ''}`.trim() },
    { label: 'Date',            key: 'created_at', format: v => v ? new Date(v).toLocaleString(undefined) : '' },
  ],
  tickets: [
    { label: 'ID',              key: 'id' },
    { label: 'Sujet',           key: 'sujet' },
    { label: 'Statut',          key: 'statut' },
    { label: 'Priorité',        key: 'priorite' },
    { label: 'Catégorie',       key: 'categorie' },
    { label: 'Auteur',          key: 'auteur_detail.prenom', format: (v, r) => `${r.auteur_detail?.prenom || ''} ${r.auteur_detail?.nom || ''}`.trim() },
    { label: 'Date création',   key: 'created_at', format: v => v ? new Date(v).toLocaleString(undefined) : '' },
    { label: 'Résolu le',       key: 'resolved_at', format: v => v ? new Date(v).toLocaleString(undefined) : '–' },
  ],
};
