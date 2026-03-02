'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, X, ChevronDown, ArrowRight, ScanLine, ArrowRightLeft,
  BookOpen, Users2, Bell, Menu, Shield, Zap, Globe, Building2, RefreshCw,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ScanLine,
    title: 'OCR & capture automatique',
    desc: 'Photographiez une facture, FinSoft la lit, l\'extrait et la classe automatiquement. Plus de saisie manuelle.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ArrowRightLeft,
    title: 'Rapprochement bancaire IA',
    desc: 'Associez vos relevés bancaires à vos factures en un clic. Notre IA apprend vos habitudes et s\'améliore.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: BookOpen,
    title: 'PCG & BOFIP intégrés',
    desc: 'Plan Comptable Général et références fiscales BOFIP accessibles dans l\'assistant IA, contextualisés à votre dossier.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Users2,
    title: 'Portail client',
    desc: 'Partagez un espace sécurisé avec vos clients pour l\'échange de documents. Zéro email, zéro pièce jointe perdue.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Bell,
    title: 'Relances automatiques',
    desc: 'Détectez les impayés et envoyez des relances personnalisées par email. Réduisez vos délais de paiement de 40%.',
    color: 'bg-rose-50 text-rose-600',
  },
]

const COMPARISON = [
  { critere: 'OCR natif + IA', finsoft: true, pennylane: true, dext: true, sage: false },
  { critere: 'Portail client intégré', finsoft: true, pennylane: false, dext: false, sage: false },
  { critere: 'PCG / BOFIP assistant', finsoft: true, pennylane: false, dext: false, sage: false },
  { critere: 'Gestion commerciale (devis, BC…)', finsoft: true, pennylane: true, dext: false, sage: true },
  { critere: 'Hébergé en France (HDS)', finsoft: true, pennylane: false, dext: false, sage: false },
]

const PLANS = [
  {
    name: 'Starter',
    priceMonthly: 0,
    priceAnnual: 0,
    desc: 'Pour démarrer et tester',
    cta: 'Démarrer gratuitement',
    ctaHref: '/auth/register',
    featured: false,
    features: ['300 factures / an', 'OCR basique', 'Dashboard KPI', 'Import relevé bancaire', '1 utilisateur'],
  },
  {
    name: 'Standard',
    priceMonthly: 29,
    priceAnnual: 23,
    desc: 'Pour les PME et indépendants',
    cta: 'Essai 14 jours gratuit',
    ctaHref: '/auth/register?plan=standard',
    featured: true,
    features: ['Factures illimitées', 'OCR + IA avancée', 'Rapprochement automatique', 'Relances automatiques', 'Gestion commerciale', '3 utilisateurs'],
  },
  {
    name: 'Cabinet',
    priceMonthly: 89,
    priceAnnual: 71,
    desc: 'Pour les experts-comptables',
    cta: "Contacter l'équipe",
    ctaHref: '#contact-cabinet',
    featured: false,
    features: ['Multi-dossiers illimités', 'Portail clients', 'PCG & BOFIP assistant IA', 'E-invoicing 2026', 'Intégrations Cegid / Sage', 'Utilisateurs illimités'],
  },
]

const TEMOIGNAGES = [
  {
    nom: 'Marie-Claire Fontaine',
    role: 'Expert-comptable — Cabinet Fontaine & Associés, Paris 8e',
    texte: 'FinSoft nous a fait gagner 2h par dossier client. Le rapprochement automatique et le portail client ont transformé notre façon de travailler.',
    initiales: 'MF',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    nom: 'Thomas Renard',
    role: 'DAF — Groupe Renard Distribution, Lyon',
    texte: "L'OCR est bluffant. On traite 400 factures fournisseurs par mois sans saisie manuelle. L'intégration avec notre Sage a été simple.",
    initiales: 'TR',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    nom: 'Sophie Aubry',
    role: 'Consultante indépendante, Bordeaux',
    texte: 'Je gère seule ma comptabilité. FinSoft m\'alerte sur les impayés, envoie les relances et je signe mes devis en 2 clics. Parfait.',
    initiales: 'SA',
    color: 'bg-violet-100 text-violet-700',
  },
]

const FAQ_ITEMS = [
  { q: 'FinSoft est-il conforme RGPD ?', r: 'Oui. Toutes vos données sont hébergées en France sur des serveurs certifiés HDS. Aucune donnée n\'est transmise à des tiers sans votre consentement.' },
  { q: 'Puis-je importer mes données depuis Sage ou Cegid ?', r: 'Oui. FinSoft dispose d\'une intégration native avec Cegid Loop et Sage via Chift. L\'import FEC est également supporté pour la reprise de l\'historique.' },
  { q: "Comment fonctionne la période d'essai ?", r: '14 jours sans engagement, sans carte bancaire. Vous accédez à toutes les fonctionnalités du plan Standard pendant l\'essai.' },
  { q: "L'OCR supporte-t-il toutes les factures ?", r: 'Notre moteur OCR traite les factures PDF, JPEG et PNG, même scannées. Il est entraîné sur des milliers de factures françaises et européennes.' },
  { q: "Qu'est-ce que l'e-invoicing 2026 ?", r: 'À partir de 2026, la facturation électronique sera obligatoire entre entreprises françaises. FinSoft vous prépare dès maintenant à cette transition avec le format Factur-X.' },
  { q: "Combien d'utilisateurs peut-on ajouter ?", r: 'Le plan Starter inclut 1 utilisateur, Standard 3, Cabinet illimité. Des utilisateurs supplémentaires peuvent être ajoutés à la carte.' },
  { q: 'Le rapprochement bancaire est-il automatique ?', r: 'Oui. Importez votre relevé bancaire (CSV, OFX) et FinSoft suggère automatiquement les correspondances avec vos factures. Vous validez en un clic.' },
  { q: "Puis-je annuler mon abonnement à tout moment ?", r: 'Absolument. Pas d\'engagement, pas de frais de résiliation. Vous pouvez exporter vos données à tout moment au format standard.' },
]

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [contactForm, setContactForm] = useState({ nom: '', cabinet: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('/api/contact/cabinet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      setSent(true)
    } catch { /* silent */ } finally { setSending(false) }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FS</span>
            </div>
            <span className="font-bold text-xl text-slate-900">FinSoft</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Tarifs</a>
            <a href="#temoignages" className="hover:text-slate-900 transition-colors">Témoignages</a>
            <a href="#contact-cabinet" className="hover:text-slate-900 transition-colors">Cabinet</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              Se connecter
            </Link>
            <Link href="/auth/register"
              className="px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm">
              Essai gratuit 14j →
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenu(!mobileMenu)}>
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            {(['#features', '#pricing', '#temoignages', '#contact-cabinet', '#faq'] as const).map((href, i) => (
              <a key={href} href={href} onClick={() => setMobileMenu(false)}
                className="block text-sm font-medium text-slate-700 py-1">
                {['Fonctionnalités', 'Tarifs', 'Témoignages', 'Cabinet', 'FAQ'][i]}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <Link href="/auth/login" className="flex-1 text-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium">Se connecter</Link>
              <Link href="/auth/register" className="flex-1 text-center px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold">Essai gratuit</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-b from-slate-50 to-white pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            E-invoicing 2026 — Préparez-vous dès maintenant
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            La comptabilité intelligente<br />
            <span className="text-emerald-500">pour les cabinets français</span>
          </h1>

          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            OCR automatique, rapprochement bancaire IA, portail client, relances et e-invoicing 2026.
            Tout ce dont votre cabinet a besoin — hébergé en France, RGPD natif.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/auth/register"
              className="flex items-center gap-2 px-6 py-3.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 text-base">
              Démarrer l&apos;essai gratuit
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#contact-cabinet"
              className="flex items-center gap-2 px-6 py-3.5 border border-gray-200 text-slate-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-base">
              Contacter un expert →
            </a>
          </div>

          {/* Badges confiance */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🇫🇷</span>
              Hébergé en France
            </div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              RGPD &amp; HDS certifié
            </div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              14 jours d&apos;essai gratuit
            </div>
            <div className="w-px h-4 bg-gray-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              Sans carte bancaire
            </div>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-slate-700 rounded-md h-5 w-48 mx-auto" />
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'CA ce mois', value: '48 200 €', note: '↑ +8% vs mois dernier', up: true },
                { label: 'Factures en attente', value: '12', note: '↓ 3 en retard', up: false },
                { label: 'Taux TVA collectée', value: '19,6%', note: '↑ conforme', up: true },
                { label: 'Rapprochement', value: '94%', note: '↑ automatisé', up: true },
              ].map((kpi, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
                  <p className={`text-xs mt-1 font-medium ${kpi.up ? 'text-emerald-600' : 'text-amber-600'}`}>{kpi.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS CLIENTS ── */}
      <section className="border-y border-gray-100 py-10 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Ils font confiance à FinSoft
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {['Cabinet Moreau', 'Expertise & Co', 'ASET Conseil', 'Fiduciaire Martin', 'GDC Partners', 'Audit Alliance'].map(n => (
              <div key={n} className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Tout ce dont vous avez besoin</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Une plateforme unifiée pour la comptabilité, la gestion commerciale et la relation client.</p>
          </div>

          <div className="space-y-20">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`flex flex-col lg:flex-row items-center gap-12 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="flex-1">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${f.color} mb-4`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-base">{f.desc}</p>
                </div>
                <div className="flex-1 w-full lg:w-auto">
                  <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-gray-200 aspect-video flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-2xl ${f.color} flex items-center justify-center opacity-40`}>
                      <f.icon className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARAISON ── */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Pourquoi FinSoft ?</h2>
            <p className="text-slate-500">Comparatif honnête avec les solutions du marché</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 font-semibold text-slate-700 w-1/2">Fonctionnalité</th>
                  <th className="px-4 py-4 font-bold text-emerald-600 text-center">FinSoft</th>
                  <th className="px-4 py-4 font-medium text-slate-500 text-center hidden sm:table-cell">Pennylane</th>
                  <th className="px-4 py-4 font-medium text-slate-500 text-center hidden md:table-cell">Dext</th>
                  <th className="px-4 py-4 font-medium text-slate-500 text-center hidden lg:table-cell">Sage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {COMPARISON.map(row => (
                  <tr key={row.critere} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-700">{row.critere}</td>
                    <td className="px-4 py-4 text-center">{row.finsoft ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                    <td className="px-4 py-4 text-center hidden sm:table-cell">{row.pennylane ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                    <td className="px-4 py-4 text-center hidden md:table-cell">{row.dext ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">{row.sage ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Tarifs simples et transparents</h2>
            <p className="text-slate-500 mb-8">Pas de frais cachés. Changez de plan à tout moment.</p>
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Mensuel
              </button>
              <button onClick={() => setAnnual(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${annual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Annuel
                <span className="ml-1.5 text-xs font-bold text-emerald-600">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => {
              const price = annual ? plan.priceAnnual : plan.priceMonthly
              return (
                <div key={plan.name} className={`rounded-2xl border p-6 relative flex flex-col ${plan.featured ? 'border-emerald-400 shadow-lg shadow-emerald-500/10 bg-white' : 'border-gray-200 bg-white'}`}>
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">Recommandé</span>
                    </div>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-xs text-slate-500 mb-4">{plan.desc}</p>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{price === 0 ? 'Gratuit' : `${price}€`}</span>
                      {price > 0 && <span className="text-slate-400 text-sm mb-1">/mois</span>}
                    </div>
                    {annual && price > 0 && <p className="text-xs text-emerald-600 mt-1">Facturé {price * 12}€/an</p>}
                  </div>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href={plan.ctaHref}
                    className={`block text-center py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${plan.featured ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm' : 'border border-gray-200 text-slate-700 hover:bg-gray-50'}`}>
                    {plan.cta}
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION CABINET ── */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400 mb-6">
            Pour les experts-comptables
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Gérez tous vos dossiers depuis une seule plateforme
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8">
            Multi-dossiers, portail client, e-invoicing, intégrations Cegid &amp; Sage.
            FinSoft est conçu pour les cabinets qui veulent gagner du temps sur chaque dossier.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {['Multi-dossiers illimités', 'Portail client sécurisé', 'E-invoicing 2026 natif', 'Intégration Cegid / Sage'].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <a href="#contact-cabinet"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
            Parler à un expert cabinet
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section id="temoignages" className="py-24 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Ils ont adopté FinSoft</h2>
            <p className="text-slate-500">Plus de 200 cabinets et PME font confiance à notre plateforme</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEMOIGNAGES.map(t => (
              <div key={t.nom} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <p className="text-slate-700 text-sm leading-relaxed mb-5 italic">&ldquo;{t.texte}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${t.color}`}>
                    {t.initiales}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.nom}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left">
                  <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-slate-600 leading-relaxed">{item.r}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT CABINET ── */}
      <section id="contact-cabinet" className="py-24 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Parlons de votre cabinet</h2>
            <p className="text-slate-500">Un expert FinSoft vous répond sous 24h pour étudier vos besoins spécifiques.</p>
          </div>

          {sent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900 mb-2">Message envoyé !</p>
              <p className="text-slate-500 text-sm">Notre équipe vous contactera dans les 24h.</p>
            </div>
          ) : (
            <form onSubmit={e => void handleContact(e)} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Votre nom *</label>
                  <input required value={contactForm.nom}
                    onChange={e => setContactForm(p => ({ ...p, nom: e.target.value }))}
                    placeholder="Marie Fontaine"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Cabinet *</label>
                  <input required value={contactForm.cabinet}
                    onChange={e => setContactForm(p => ({ ...p, cabinet: e.target.value }))}
                    placeholder="Cabinet Fontaine & Associés"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email professionnel *</label>
                <input required type="email" value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="marie@cabinet-fontaine.fr"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Votre besoin</label>
                <textarea value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Nombre de dossiers, logiciel actuel, fonctionnalités prioritaires…"
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none" />
              </div>
              <button type="submit" disabled={sending}
                className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors text-sm">
                {sending ? 'Envoi en cours…' : 'Envoyer ma demande →'}
              </button>
              <p className="text-xs text-slate-400 text-center">Vos données ne sont jamais partagées avec des tiers.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FS</span>
                </div>
                <span className="font-bold text-xl text-white">FinSoft</span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">
                La solution comptable intelligente pour les cabinets d&apos;expertise comptable et PME françaises.
              </p>
              <div className="flex items-center gap-2 mt-4 text-xs text-emerald-400 font-medium">
                <span>🇫🇷</span>
                Hébergé en France — RGPD &amp; HDS
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
                <li><Link href="/auth/register" className="hover:text-white transition-colors">Essai gratuit</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Se connecter</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link></li>
                <li><Link href="/cgv" className="hover:text-white transition-colors">CGV</Link></li>
                <li><Link href="/cgu" className="hover:text-white transition-colors">CGU</Link></li>
                <li><Link href="/politique-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© {new Date().getFullYear()} FinSoft. Tous droits réservés.</p>
            <p>Conçu pour les experts-comptables français 🇫🇷</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
