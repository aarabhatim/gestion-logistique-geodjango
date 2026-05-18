from django.conf import settings
from django.db import models
from django.utils import timezone


class Contrat(models.Model):
    TYPE_SERVICE_CHOICES = [
        ('standard', 'Livraison standard'),
        ('express', 'Livraison express'),
        ('recurrente', 'Livraison récurrente'),
        ('bulk', 'Livraison en volume'),
    ]
    STATUT_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('envoye', 'Envoyé pour signature'),
        ('signe', 'Signé'),
        ('actif', 'Actif'),
        ('expire', 'Expiré'),
        ('resilie', 'Résilié'),
    ]

    # ── Parties ───────────────────────────────────────────────────────────────
    # Au moins boutique + client ; transporteur optionnel
    boutique = models.ForeignKey(
        'fondateurs.Fondateur', on_delete=models.CASCADE,
        related_name='contrats', null=True, blank=True,
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='contrats_client', null=True, blank=True,
        limit_choices_to={'role': 'CLIENT'},
    )
    transporteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        related_name='contrats_transporteur', null=True, blank=True,
        limit_choices_to={'role': 'TRANSPORTEUR'},
    )
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        related_name='contrats_crees', null=True,
    )
    commande = models.OneToOneField(
        'commandes.Commande', on_delete=models.CASCADE,
        related_name='contrat_livraison', null=True, blank=True,
    )

    # ── Termes ────────────────────────────────────────────────────────────────
    titre = models.CharField(max_length=300)
    type_service = models.CharField(max_length=20, choices=TYPE_SERVICE_CHOICES, default='standard')
    tarif_negocie = models.DecimalField(max_digits=10, decimal_places=2)
    description_termes = models.TextField(blank=True)

    # ── Durée ─────────────────────────────────────────────────────────────────
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='brouillon')

    # ── Fichier PDF généré ────────────────────────────────────────────────────
    fichier_pdf = models.FileField(
        upload_to='contrats/pdf/', blank=True, null=True
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    signe_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Contrat'
        verbose_name_plural = 'Contrats'
        ordering = ['-created_at']

    def __str__(self):
        return f"Contrat #{self.pk} — {self.titre} [{self.get_statut_display()}]"

    @property
    def jours_avant_expiration(self):
        if not self.date_fin:
            return None
        delta = self.date_fin - timezone.now().date()
        return delta.days

    @property
    def expiration_imminente(self):
        j = self.jours_avant_expiration
        return j is not None and 0 <= j <= 14

    def verifier_expiration(self):
        """Passe à 'expiré' si date_fin dépassée, notifie si imminente."""
        today = timezone.now().date()
        if self.statut == 'actif' and self.date_fin < today:
            self.statut = 'expire'
            self.save(update_fields=['statut'])
            self._notifier_expiration(expire=True)
        elif self.statut == 'actif' and self.expiration_imminente:
            self._notifier_expiration(expire=False)

    def _notifier_expiration(self, expire=False):
        from notifications.models import envoyer_notification
        j = self.jours_avant_expiration
        titre = (
            f"⛔ Contrat expiré — #{self.pk}"
            if expire
            else f"⏳ Contrat expire dans {j} jours — #{self.pk}"
        )
        message = (
            f"Le contrat '{self.titre}' a expiré le {self.date_fin}."
            if expire
            else f"Le contrat '{self.titre}' expire le {self.date_fin} ({j} jours restants)."
        )
        destinataires = []
        if self.cree_par:
            destinataires.append(self.cree_par)
        if self.client:
            destinataires.append(self.client)
        for user in set(destinataires):
            envoyer_notification(user, titre=titre, message=message, type_notif='WARNING')

    def generer_pdf(self):
        """Génère le PDF du contrat avec ReportLab et le sauvegarde."""
        import io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from django.core.files.base import ContentFile

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm
        )
        styles = getSampleStyleSheet()
        story = []

        # ── Titre ─────────────────────────────────────────────────────────────
        title_style = ParagraphStyle(
            'Title', parent=styles['Title'],
            fontSize=18, textColor=colors.HexColor('#1e40af'), spaceAfter=12
        )
        story.append(Paragraph(f"CONTRAT DE SERVICE — #{self.pk}", title_style))
        story.append(Paragraph(self.titre, styles['Heading2']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#93c5fd')))
        story.append(Spacer(1, 0.4*cm))

        # ── Parties ───────────────────────────────────────────────────────────
        story.append(Paragraph("Parties impliquées", styles['Heading3']))
        parties_data = [['Rôle', 'Nom / Entité']]
        if self.boutique:
            parties_data.append(['Boutique', self.boutique.nom_boutique])
        if self.client:
            parties_data.append(['Client', self.client.get_full_name() or self.client.username])
        if self.transporteur:
            parties_data.append(['Transporteur', self.transporteur.get_full_name() or self.transporteur.username])
        t = Table(parties_data, colWidths=[5*cm, 12*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4*cm))

        # ── Termes ────────────────────────────────────────────────────────────
        story.append(Paragraph("Termes du contrat", styles['Heading3']))
        termes_data = [
            ['Type de service', self.get_type_service_display()],
            ['Tarif négocié', f"{self.tarif_negocie} MAD"],
            ['Date de début', str(self.date_debut)],
            ['Date de fin', str(self.date_fin)],
            ['Statut', self.get_statut_display()],
        ]
        t2 = Table(termes_data, colWidths=[5*cm, 12*cm])
        t2.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        story.append(t2)
        story.append(Spacer(1, 0.4*cm))

        if self.description_termes:
            story.append(Paragraph("Clauses & conditions", styles['Heading3']))
            story.append(Paragraph(self.description_termes.replace('\n', '<br/>'), styles['Normal']))
            story.append(Spacer(1, 0.4*cm))

        # ── Signatures ────────────────────────────────────────────────────────
        story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("Signatures", styles['Heading3']))
        sig_data = [['Partie', 'Signature', 'Date']]
        if self.boutique:
            sig_data.append(['Boutique', '______________________', ''])
        if self.client:
            sig_data.append(['Client', '______________________', ''])
        if self.transporteur:
            sig_data.append(['Transporteur', '______________________', ''])
        t3 = Table(sig_data, colWidths=[4*cm, 8*cm, 5*cm])
        t3.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('ROWHEIGHT', (0, 1), (-1, -1), 30),
        ]))
        story.append(t3)

        # ── Pied de page ──────────────────────────────────────────────────────
        story.append(Spacer(1, 1*cm))
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'],
            fontSize=8, textColor=colors.grey, alignment=1
        )
        story.append(Paragraph(
            f"Document généré par DeliverMap — {timezone.now().strftime('%d/%m/%Y %H:%M')}",
            footer_style
        ))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        filename = f"contrat_{self.pk}_{self.date_debut}.pdf"
        self.fichier_pdf.save(filename, ContentFile(pdf_bytes), save=True)
        return self.fichier_pdf
