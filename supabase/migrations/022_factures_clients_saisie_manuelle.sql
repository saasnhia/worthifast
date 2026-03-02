-- Migration 022: Factures clients — saisie manuelle
-- Ajoute 3 colonnes à factures_clients pour les lignes de détail,
-- conditions de paiement et remise

ALTER TABLE factures_clients
  ADD COLUMN IF NOT EXISTS lignes JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS conditions_paiement TEXT DEFAULT '30 jours',
  ADD COLUMN IF NOT EXISTS remise_percent NUMERIC(5,2) DEFAULT 0;

COMMENT ON COLUMN factures_clients.lignes IS 'Lignes de détail JSONB: [{description, quantite, prix_unitaire_ht, taux_tva}]';
COMMENT ON COLUMN factures_clients.conditions_paiement IS 'Ex: 30 jours, 60 jours, comptant';
COMMENT ON COLUMN factures_clients.remise_percent IS 'Remise globale en % (0-100)';
