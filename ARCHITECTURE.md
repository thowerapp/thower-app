# Architecture & Navigation - Thower App

## 🗂️ Structure générale

```
src/routes/user/
├── +layout.svelte         # Layout principal (Hero + Navigation basse + Scroll)
├── +page.svelte           # Accueil (2 cartes principales)
├── +page.server.ts        # Données utilisateur
│
├── sport/
│   └── +page.svelte       # Pages Sport (à développer)
│
├── nutrition/
│   └── +page.svelte       # Pages Nutrition (à développer)
│
├── decouverte/
│   └── +page.svelte       # Onglet Découverte (Méditation, Mindset, Breathwork)
│
├── journee/
│   └── +page.svelte       # Onglet Journée (Checklist)
│
├── progression/
│   └── +page.svelte       # Onglet Progression (Stats, Badges)
│
└── parametres/
    └── +page.svelte       # Onglet Paramètres
```

## 🧭 Navigation - Flux utilisateur

### Accueil `/user`
```
┌─────────────────────────────────────────┐
│         HERO (THOWER)                   │
│  Semaine 4 · Jour 21                    │
│  [Aujourd'hui] [Profil]                 │
└─────────────────────────────────────────┘
│                                         │
│  Mon programme                          │
│  ┌─────────────┐    ┌─────────────┐   │
│  │●            │    │■            │   │
│  │ Sport       │    │ Nutrition   │   │
│  │ Calendrier  │    │ Cadencier   │   │
│  │ Séances     │    │ Recettes    │   │
│  └─────────────┘    └─────────────┘   │
│       ↓                   ↓            │
│   /sport             /nutrition        │
│                                         │
│  À la une                               │
│  - La méthode Thower                    │
│  - Élastiques & Matériel                │
│                                         │
└─────────────────────────────────────────┘
   │
   │ Bottom Nav (4 onglets)
   ├─ DÉCOUVERTE (onglet)
   ├─ JOURNÉE (onglet)
   ├─ PROGRESSION (onglet)
   └─ PARAMÈTRES (onglet)
```

### Pages détail

#### 1. **Sport** `/user/sport`
- Calendrier hebdomadaire
- Liste des séances (A, B, C, Découverte)
- À développer

#### 2. **Nutrition** `/user/nutrition`
- Cadencier
- Recettes
- Liste de courses
- À développer

#### 3. **Découverte** `/user/decouverte`
- Méditation
- Mindset
- Breathwork

#### 4. **Journée** `/user/journee`
- Checklist du jour
- Points du jour

#### 5. **Progression** `/user/progression`
- Stats (Points, Séances, Score)
- Statut (Bambou Furieux, etc.)
- Badges
- Photos du mois
- Bilan 90j

#### 6. **Paramètres** `/user/parametres`
- Profil & Données
- Abonnement
- Notifications

---

## 🔀 Flux de navigation détaillé

```
USER FLOW - Navigation principale
═════════════════════════════════════════════════════════════

[ACCUEIL /user]
    ↓
    ├─→ Clique sur "Sport"
    │       ↓
    │   [SPORT /user/sport] ← bottom nav show:
    │       ↓              │  · DÉCOUVERTE (inactive)
    │   Revenez en back    │  · JOURNÉE (inactive)
    │       ↓              │  · PROGRESSION (inactive)
    │   puis sur "Nutrition"  · PARAMÈTRES (inactive)
    │       ↓
    ├─→ [NUTRITION /user/nutrition]
    │       ↓
    │   Clique sur
    │   bottom nav
    │       ↓
    ├─→ [DÉCOUVERTE /user/decouverte] ← bottom nav show: ON
    │       ↓
    │   Explore Méditation, Mindset, Breathwork
    │       ↓
    ├─→ [JOURNÉE /user/journee] ← bottom nav show: ON
    │       ↓
    │   Complète checklist
    │       ↓
    ├─→ [PROGRESSION /user/progression] ← bottom nav show: ON
    │       ↓
    │   Voir stats & badges
    │       ↓
    └─→ [PARAMÈTRES /user/parametres] ← bottom nav show: ON
            ↓
        Gérer compte & préférences
```

---

## 📱 Layout principal

```
┌─────────────────────────────────────────┐
│  STATUS BAR (Heure, Batterie, Signal)  │ ← .sbar (dark)
├─────────────────────────────────────────┤
│                                         │
│          HERO SECTION                   │ ← .hero
│   (Thower Logo - 250px min)            │ ← min-height: 250px
│                                         │
├─────────────────────────────────────────┤
│                                         │
│       SCROLL AREA (flex: 1)             │ ← .scroll
│         <slot />                        │ ← Contenu spécifique
│   (Sport, Nutrition, Onglets, etc.)    │ ← min-height: 0
│                                         │
├─────────────────────────────────────────┤
│   BOTTOM NAVIGATION (4 onglets)         │ ← .bottom-nav
│  Découverte|Journée|Progression|Params  │
└─────────────────────────────────────────┘
```

---

## 🎨 États des onglets (bottom nav)

### Quand on est sur `/user` (accueil)
- Aucun onglet n'est marqué "ON"

### Quand on est sur `/user/decouverte`
- Onglet "DÉCOUVERTE" → classe `.on`

### Quand on est sur `/user/journee`
- Onglet "JOURNÉE" → classe `.on`

### Quand on est sur `/user/progression`
- Onglet "PROGRESSION" → classe `.on`

### Quand on est sur `/user/parametres`
- Onglet "PARAMÈTRES" → classe `.on`

---

## 📋 Détection d'onglet actif (TypeScript)

```typescript
function getTabFromRoute(pathname: string): string {
  if (pathname.includes('/decouverte')) return 'decouverte';
  if (pathname.includes('/journee')) return 'journee';
  if (pathname.includes('/progression')) return 'progression';
  if (pathname.includes('/parametres')) return 'parametres';
  return 'home'; // Accueil / Sport / Nutrition
}
```

---

## 🚀 À développer

- [ ] Pages Sport détaillées (calendrier, séances)
- [ ] Pages Nutrition détaillées (cadencier, recettes)
- [ ] Intégration backend
- [ ] Authentification utilisateur
- [ ] Données dynamiques (séances, nutrition, progression)

