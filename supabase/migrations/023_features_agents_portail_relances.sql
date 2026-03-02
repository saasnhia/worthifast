-- Migration 023: Agents IA custom, PCG sources, Portail client, Relances auto
-- Créé le 2026-03-02

-- ─── FEATURE 1 : Agents IA personnalisés ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents_ia_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  avatar_emoji TEXT DEFAULT '🤖',
  couleur TEXT DEFAULT '#6366f1',
  system_prompt TEXT NOT NULL,
  secteur_metier TEXT,
  sources TEXT[] DEFAULT '{"pcg","bofip"}',
  temperature NUMERIC(3,2) DEFAULT 0.3,
  actif BOOLEAN DEFAULT true,
  nb_conversations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents_ia_custom_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents_ia_custom(id) ON DELETE CASCADE,
  nom TEXT,
  contenu TEXT,
  type TEXT DEFAULT 'procedure',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agents_ia_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents_ia_custom_docs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents_ia_custom' AND policyname = 'agents_ia_custom_user_policy') THEN
    CREATE POLICY agents_ia_custom_user_policy ON agents_ia_custom FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents_ia_custom_docs' AND policyname = 'agents_ia_custom_docs_user_policy') THEN
    CREATE POLICY agents_ia_custom_docs_user_policy ON agents_ia_custom_docs FOR ALL
      USING (agent_id IN (SELECT id FROM agents_ia_custom WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_ia_custom_user_id ON agents_ia_custom(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_ia_custom_docs_agent_id ON agents_ia_custom_docs(agent_id);

-- ─── FEATURE 2 : PCG Sources ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pcg_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe INTEGER,
  compte TEXT UNIQUE NOT NULL,
  intitule TEXT NOT NULL,
  description TEXT,
  sens_normal TEXT DEFAULT 'debit',
  categorie TEXT
);

-- Seed: 80 comptes PCG les plus utilisés en cabinet
INSERT INTO pcg_sources (classe, compte, intitule, description, sens_normal, categorie) VALUES
-- Classe 1 — Comptes de capitaux
(1,'101','Capital social','Capital souscrit et versé par les associés','credit','capitaux'),
(1,'106','Réserves','Réserves légale, statutaire, réglementées et autres','credit','capitaux'),
(1,'110','Report à nouveau (créditeur)','Bénéfice non distribué des exercices précédents','credit','capitaux'),
(1,'120','Résultat de l''exercice (bénéfice)','Résultat bénéficiaire de l''exercice clôturé','credit','capitaux'),
(1,'129','Résultat de l''exercice (perte)','Résultat déficitaire de l''exercice clôturé','debit','capitaux'),
(1,'164','Emprunts auprès des établissements de crédit','Emprunts bancaires moyen et long terme','credit','dettes_financieres'),
-- Classe 2 — Immobilisations
(2,'201','Frais d''établissement','Frais de constitution, de démarrage','debit','immobilisations_incorporelles'),
(2,'211','Terrains','Terrains bâtis, non bâtis, aménagements','debit','immobilisations_corporelles'),
(2,'215','Installations techniques, matériel et outillage','Matériel industriel, outillage','debit','immobilisations_corporelles'),
(2,'218','Autres immobilisations corporelles','Mobilier, matériel de bureau, informatique','debit','immobilisations_corporelles'),
(2,'261','Titres de participation','Parts détenues dans le capital d''autres sociétés','debit','immobilisations_financieres'),
(2,'271','Titres immobilisés','Valeurs mobilières conservées à long terme','debit','immobilisations_financieres'),
(2,'280','Amortissements des immobilisations incorporelles','Cumul amortissements actifs incorporels','credit','amortissements'),
(2,'291','Dépréciations des immobilisations corporelles','Provisions pour dépréciation actifs corporels','credit','depreciations'),
-- Classe 3 — Stocks
(3,'311','Matières premières','Stocks matières premières et approvisionnements','debit','stocks'),
(3,'371','Marchandises','Stocks de marchandises achetées pour revente','debit','stocks'),
-- Classe 4 — Comptes de tiers
(4,'401','Fournisseurs','Dettes envers les fournisseurs de biens et services','credit','fournisseurs'),
(4,'404','Fournisseurs d''immobilisations','Dettes envers fournisseurs d''actifs immobilisés','credit','fournisseurs'),
(4,'408','Fournisseurs — factures non parvenues','Charges à payer — factures en attente de réception','credit','fournisseurs'),
(4,'411','Clients','Créances sur clients — montants à encaisser','debit','clients'),
(4,'416','Clients douteux ou litigieux','Créances clients présentant un risque de non-paiement','debit','clients'),
(4,'419','Clients créditeurs','Avances et acomptes reçus de clients','credit','clients'),
(4,'421','Personnel — rémunérations dues','Salaires nets à payer au personnel','credit','personnel'),
(4,'425','Personnel — avances et acomptes','Avances versées aux salariés','debit','personnel'),
(4,'431','Sécurité sociale','Cotisations sociales dues à l''URSSAF','credit','organismes_sociaux'),
(4,'437','Autres organismes sociaux','Retraite, prévoyance, mutuelle, etc.','credit','organismes_sociaux'),
(4,'4452','TVA due intracommunautaire','TVA sur acquisitions intracommunautaires','credit','tva'),
(4,'4456','TVA déductible','TVA récupérable sur achats et charges','debit','tva'),
(4,'4457','TVA collectée','TVA facturée aux clients et reversée à l''État','credit','tva'),
(4,'455','Associés — comptes courants','Prêts et avances des associés à la société','credit','associes'),
(4,'467','Autres comptes débiteurs ou créditeurs','Débiteurs et créditeurs divers','debit','divers'),
(4,'481','Charges à répartir sur plusieurs exercices','Charges différées sur plusieurs exercices','debit','regularisation'),
(4,'486','Charges constatées d''avance','Charges payées non consommées à la clôture','debit','regularisation'),
(4,'487','Produits constatés d''avance','Produits encaissés non encore acquis à la clôture','credit','regularisation'),
-- Classe 5 — Comptes financiers
(5,'512','Banques','Soldes bancaires — comptes courants et dépôts','debit','tresorerie'),
(5,'530','Caisse','Liquidités disponibles en caisse','debit','tresorerie'),
-- Classe 6 — Charges
(6,'601','Achats de matières premières','Achats de matières et approvisionnements stockés','debit','achats'),
(6,'602','Achats d''autres approvisionnements','Emballages, fournitures de bureau stockés','debit','achats'),
(6,'606','Achats non stockés de matières et fournitures','Petit matériel, fournitures consommées directement','debit','achats'),
(6,'607','Achats de marchandises','Achats de biens destinés à la revente','debit','achats'),
(6,'611','Sous-traitance générale','Prestations sous-traitées à des tiers','debit','services_exterieurs'),
(6,'613','Locations','Loyers de locaux, véhicules, matériels','debit','services_exterieurs'),
(6,'614','Charges locatives et de copropriété','Charges de copropriété, entretien locaux loués','debit','services_exterieurs'),
(6,'615','Entretien et réparations','Maintenance, réparations des actifs de l''entreprise','debit','services_exterieurs'),
(6,'616','Primes d''assurances','Assurances RC, incendie, multirisque, prévoyance','debit','services_exterieurs'),
(6,'617','Études et recherches','Frais d''études, enquêtes, recherche et développement','debit','services_exterieurs'),
(6,'618','Divers — documentation et conférences','Abonnements, livres, frais de conférences','debit','services_exterieurs'),
(6,'621','Personnel extérieur à l''entreprise','Intérim, mise à disposition de personnel','debit','charges_personnel'),
(6,'622','Rémunérations d''intermédiaires et honoraires','Honoraires comptables, avocats, experts','debit','autres_charges'),
(6,'623','Publicité, publications, relations publiques','Communication, marketing, sponsoring','debit','autres_charges'),
(6,'624','Transports de biens et de personnes','Transport de marchandises, navettes','debit','autres_charges'),
(6,'625','Déplacements, missions et réceptions','Notes de frais, hébergement, restauration professionnelle','debit','autres_charges'),
(6,'626','Frais postaux et télécommunications','PTT, téléphone, internet, affranchissement','debit','autres_charges'),
(6,'627','Services bancaires et assimilés','Frais de tenue de compte, commissions bancaires','debit','autres_charges'),
(6,'628','Divers — frais de gardiennage','Gardiennage, nettoyage, sécurité','debit','autres_charges'),
(6,'631','Impôts, taxes sur rémunérations','Taxe apprentissage, formation professionnelle','debit','impots_taxes'),
(6,'633','Impôts, taxes — autres','C3S, taxe foncière professionnelle','debit','impots_taxes'),
(6,'635','Autres impôts, taxes et versements assimilés','CET, CFE, CVAE, taxes diverses','debit','impots_taxes'),
(6,'641','Rémunérations du personnel','Salaires bruts versés aux salariés','debit','charges_personnel'),
(6,'645','Charges de sécurité sociale et de prévoyance','Cotisations patronales URSSAF, retraite','debit','charges_personnel'),
(6,'651','Redevances pour concessions, brevets, licences','Royalties, droits d''utilisation de propriété intellectuelle','debit','autres_charges'),
(6,'654','Pertes sur créances irrécouvrables','Créances clients définitivement irrécouvrables','debit','autres_charges'),
(6,'661','Charges d''intérêts','Intérêts sur emprunts et crédits bancaires','debit','charges_financieres'),
(6,'671','Charges exceptionnelles sur opérations de gestion','Amendes, pénalités, rappels d''impôts','debit','charges_exceptionnelles'),
(6,'675','Valeurs comptables des éléments d''actif cédés','Valeur nette des actifs vendus ou mis au rebut','debit','charges_exceptionnelles'),
(6,'681','Dotations aux amortissements — exploitation','Amortissements des immobilisations corporelles et incorporelles','debit','dotations'),
(6,'686','Dotations aux amortissements — financières','Amortissements des primes de remboursement','debit','dotations'),
(6,'691','Participation des salariés','Participation légale aux bénéfices de l''entreprise','debit','charges_personnel'),
(6,'695','Impôts sur les bénéfices','IS — impôt sur les sociétés','debit','impots_taxes'),
-- Classe 7 — Produits
(7,'701','Ventes de produits finis','Chiffre d''affaires sur ventes de production propre','credit','chiffre_affaires'),
(7,'706','Prestations de services','Honoraires, commissions, CA prestations','credit','chiffre_affaires'),
(7,'707','Ventes de marchandises','CA négoce — revente de biens achetés','credit','chiffre_affaires'),
(7,'708','Produits des activités annexes','Locations, commissions, produits accessoires','credit','chiffre_affaires'),
(7,'740','Subventions d''exploitation','Aides, subventions liées à l''activité courante','credit','produits_exploitation'),
(7,'750','Redevances pour concessions, brevets, licences','Revenus de la cession de droits de propriété','credit','produits_exploitation'),
(7,'751','Revenus des immeubles','Loyers perçus sur immeubles non affectés à l''activité','credit','produits_exploitation'),
(7,'761','Produits de participation','Dividendes reçus des filiales et participations','credit','produits_financiers'),
(7,'771','Produits exceptionnels sur opérations de gestion','Indemnités, libéralités, pénalités reçues','credit','produits_exceptionnels'),
(7,'781','Reprises sur amortissements — exploitation','Annulation partielle ou totale d''amortissements','credit','reprises'),
(7,'786','Reprises sur provisions — financières','Annulation de provisions pour risques financiers','credit','reprises'),
(7,'791','Transferts de charges d''exploitation','Refacturation de charges à des tiers ou filiales','credit','reprises')
ON CONFLICT (compte) DO NOTHING;

-- ─── FEATURE 3 : Portail Client Collaboratif ──────────────────────────────────
CREATE TABLE IF NOT EXISTS portail_acces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_nom TEXT NOT NULL,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  actif BOOLEAN DEFAULT true,
  derniere_connexion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portail_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portail_id UUID REFERENCES portail_acces(id) ON DELETE CASCADE,
  nom TEXT,
  url TEXT,
  type TEXT DEFAULT 'autre',
  uploaded_by TEXT DEFAULT 'client',
  statut TEXT DEFAULT 'en_attente',
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portail_id UUID REFERENCES portail_acces(id) ON DELETE CASCADE,
  expediteur TEXT NOT NULL,
  message TEXT NOT NULL,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portail_acces ENABLE ROW LEVEL SECURITY;
ALTER TABLE portail_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE portail_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portail_acces' AND policyname = 'portail_acces_cabinet_policy') THEN
    CREATE POLICY portail_acces_cabinet_policy ON portail_acces FOR ALL USING (auth.uid() = cabinet_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portail_documents' AND policyname = 'portail_documents_cabinet_policy') THEN
    CREATE POLICY portail_documents_cabinet_policy ON portail_documents FOR ALL
      USING (portail_id IN (SELECT id FROM portail_acces WHERE cabinet_user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portail_messages' AND policyname = 'portail_messages_cabinet_policy') THEN
    CREATE POLICY portail_messages_cabinet_policy ON portail_messages FOR ALL
      USING (portail_id IN (SELECT id FROM portail_acces WHERE cabinet_user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portail_acces_cabinet ON portail_acces(cabinet_user_id);
CREATE INDEX IF NOT EXISTS idx_portail_acces_token ON portail_acces(token);
CREATE INDEX IF NOT EXISTS idx_portail_documents_portail ON portail_documents(portail_id);
CREATE INDEX IF NOT EXISTS idx_portail_messages_portail ON portail_messages(portail_id);

-- ─── FEATURE 4 : Relances automatiques impayés ────────────────────────────────
CREATE TABLE IF NOT EXISTS relances_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  actif BOOLEAN DEFAULT false,
  delai_j1 INTEGER DEFAULT 7,
  delai_j2 INTEGER DEFAULT 15,
  delai_j3 INTEGER DEFAULT 30,
  ton TEXT DEFAULT 'cordial',
  signature TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS relances_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID REFERENCES factures_clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  niveau INTEGER NOT NULL CHECK (niveau IN (1,2,3)),
  email_destinataire TEXT,
  contenu TEXT,
  statut TEXT DEFAULT 'envoye',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE relances_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE relances_historique ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'relances_config' AND policyname = 'relances_config_user_policy') THEN
    CREATE POLICY relances_config_user_policy ON relances_config FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'relances_historique' AND policyname = 'relances_historique_user_policy') THEN
    CREATE POLICY relances_historique_user_policy ON relances_historique FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_relances_config_user ON relances_config(user_id);
CREATE INDEX IF NOT EXISTS idx_relances_historique_user ON relances_historique(user_id);
CREATE INDEX IF NOT EXISTS idx_relances_historique_facture ON relances_historique(facture_id);
