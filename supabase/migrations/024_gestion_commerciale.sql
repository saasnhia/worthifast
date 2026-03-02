-- Migration 024 — Gestion Commerciale Complète
-- Tables: documents_commerciaux, catalogue_produits, historique_documents, abonnements_recurrents, imports_ecritures

-- ═══════════════════════════════════════
-- TABLE: documents_commerciaux
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS documents_commerciaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('devis','bon_commande','bon_livraison','proforma','avoir','facture_recurrente')),
  numero TEXT,
  statut TEXT DEFAULT 'brouillon' CHECK (statut IN ('brouillon','envoye','accepte','refuse','valide','annule','livre')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_nom TEXT,
  client_email TEXT,
  client_adresse TEXT,
  client_siren TEXT,
  lignes JSONB DEFAULT '[]'::jsonb,
  sous_total_ht NUMERIC(12,2) DEFAULT 0,
  remise_percent NUMERIC(5,2) DEFAULT 0,
  total_ht NUMERIC(12,2) DEFAULT 0,
  total_tva NUMERIC(12,2) DEFAULT 0,
  total_ttc NUMERIC(12,2) DEFAULT 0,
  acompte NUMERIC(12,2) DEFAULT 0,
  conditions_paiement TEXT DEFAULT '30 jours',
  notes TEXT,
  validite_jours INTEGER DEFAULT 30,
  date_emission DATE DEFAULT CURRENT_DATE,
  date_echeance DATE,
  date_livraison DATE,
  facture_liee_id UUID REFERENCES documents_commerciaux(id) ON DELETE SET NULL,
  devis_lie_id UUID REFERENCES documents_commerciaux(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_commerciaux_user_id ON documents_commerciaux(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_commerciaux_type ON documents_commerciaux(type);
CREATE INDEX IF NOT EXISTS idx_documents_commerciaux_statut ON documents_commerciaux(statut);
CREATE INDEX IF NOT EXISTS idx_documents_commerciaux_client_id ON documents_commerciaux(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_commerciaux_created_at ON documents_commerciaux(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_commerciaux_numero ON documents_commerciaux(user_id, numero) WHERE numero IS NOT NULL;

ALTER TABLE documents_commerciaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "documents_commerciaux_user_select" ON documents_commerciaux
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "documents_commerciaux_user_insert" ON documents_commerciaux
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "documents_commerciaux_user_update" ON documents_commerciaux
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "documents_commerciaux_user_delete" ON documents_commerciaux
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- TABLE: catalogue_produits
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS catalogue_produits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reference TEXT,
  nom TEXT NOT NULL,
  description TEXT,
  prix_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva_taux NUMERIC(5,2) DEFAULT 20,
  unite TEXT DEFAULT 'unité',
  categorie TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalogue_produits_user_id ON catalogue_produits(user_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_produits_actif ON catalogue_produits(actif);

ALTER TABLE catalogue_produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "catalogue_produits_user_select" ON catalogue_produits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "catalogue_produits_user_insert" ON catalogue_produits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "catalogue_produits_user_update" ON catalogue_produits
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "catalogue_produits_user_delete" ON catalogue_produits
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- TABLE: historique_documents
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS historique_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents_commerciaux(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('creation','modification','envoi','validation','conversion','annulation','facturation')),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historique_documents_document_id ON historique_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_historique_documents_user_id ON historique_documents(user_id);

ALTER TABLE historique_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "historique_documents_user_select" ON historique_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "historique_documents_user_insert" ON historique_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- TABLE: abonnements_recurrents
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS abonnements_recurrents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_nom TEXT,
  client_email TEXT,
  nom TEXT NOT NULL,
  lignes JSONB DEFAULT '[]'::jsonb,
  frequence TEXT DEFAULT 'mensuel' CHECK (frequence IN ('hebdo','mensuel','trimestriel','annuel')),
  prochaine_facturation DATE NOT NULL DEFAULT CURRENT_DATE,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abonnements_recurrents_user_id ON abonnements_recurrents(user_id);
CREATE INDEX IF NOT EXISTS idx_abonnements_recurrents_actif ON abonnements_recurrents(actif);
CREATE INDEX IF NOT EXISTS idx_abonnements_recurrents_prochaine ON abonnements_recurrents(prochaine_facturation);

ALTER TABLE abonnements_recurrents ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "abonnements_recurrents_user_select" ON abonnements_recurrents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "abonnements_recurrents_user_insert" ON abonnements_recurrents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "abonnements_recurrents_user_update" ON abonnements_recurrents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "abonnements_recurrents_user_delete" ON abonnements_recurrents
  FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- TABLE: imports_ecritures
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS imports_ecritures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('encaissement','vente_ecommerce','caisse','paie','tiers')),
  fichier_nom TEXT,
  nb_lignes INTEGER DEFAULT 0,
  nb_importees INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'en_cours' CHECK (statut IN ('en_cours','termine','erreur')),
  erreurs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imports_ecritures_user_id ON imports_ecritures(user_id);

ALTER TABLE imports_ecritures ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "imports_ecritures_user_select" ON imports_ecritures
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "imports_ecritures_user_insert" ON imports_ecritures
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "imports_ecritures_user_update" ON imports_ecritures
  FOR UPDATE USING (auth.uid() = user_id);
