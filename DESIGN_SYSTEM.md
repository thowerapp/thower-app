<!-- Guide d'utilisation du Design System Thower -->

# Design System Thower - Guide d'Harmonisation

Votre application maintenant dispose d'un **design system global harmonisé** qui s'applique à tous les formulaires et pages.

## ✨ Fonctionnalités

### 1. **Curseur Personnalisé Global**
- Triangle cyan `#3ab8b8` qui suit la souris
- Change en doré `#c9a84c` lors du survol des éléments interactifs
- S'applique automatiquement partout

### 2. **Typographies Harmonisées**
- **H1**: `DM Sans` - Titres principaux
- **H2, H3, H4**: `Bebas Neue` - Titres secondaires (uppercase)
- **Texte corpo**: `DM Sans` - Poids 300-400, 0.95rem
- **Labels**: `DM Sans` - Poids 500, 0.85rem

### 3. **Palette de Couleurs**
```css
--thower-black: #0a0a0a;     /* Fond sombre */
--thower-white: #f0ede8;     /* Texte principal */
--thower-gold: #c9a84c;      /* Accent primaire */
--thower-teal: #3ab8b8;      /* Accent cyan */
```

### 4. **Formulaires & Shadcn/UI**
Tous les composants shadcn/ui (inputs, buttons, cards, etc.) sont automatiquement stylisés avec :
- Fond noir semi-transparent
- Bordures subtiles en blanc
- Focus states en cyan
- Transitions fluides

## 🎨 Utilisation

### Classes disponibles pour ajouter de l'accentuation

```html
<!-- Accentuation dorée -->
<span class="accent-gold">texte doré</span>
<!-- ou -->
<span class="gold">texte doré</span>

<!-- Accentuation cyan -->
<span class="accent-teal">texte cyan</span>
<!-- ou -->
<span class="teal">texte cyan</span>

<!-- Highlight de mots clés -->
<span class="highlight-word">mot en relief</span>
```

### Exemple de formulaire harmonisé

```svelte
<form class="page">
  <header class="page-header">
    <p class="page-eyebrow">— Section de formulaire</p>
    <h1>Remplir le <span class="gold">formulaire</span></h1>
    <p class="page-subtitle">Entrez vos informations</p>
  </header>

  <main class="page-main">
    <section>
      <h2>Informations <span class="teal">personnelles</span></h2>
      
      <Form.Field name="email">
        <Form.Control>
          <Form.Label>Email</Form.Label>
          <Input type="email" placeholder="votre@email.com" />
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <button type="submit">Envoyer</button>
    </section>
  </main>
</form>
```

## 🔄 Responsive Design

Le design system s'adapte automatiquement sur mobile :
- Typographies réactives avec `clamp()`
- Inputs augmentés à 16px pour éviter le zoom iOS
- Padding réduit sur petits écrans

## 📦 Fichiers du système

1. **app.css** - Style global + variables de couleurs
2. **shadcn-thower-harmony.css** - Harmonisation shadcn/ui  
3. **GlobalCursor.svelte** - Curseur personnalisé

## ✅ Checklist pour vos pages

- [ ] Page utilise les classes `page`, `page-header`, `page-main`
- [ ] Titres utilisent les bonnes typographies (H1=DM, H2-H4=Bebas)
- [ ] Mots clés accentués avec `.accent-gold`, `.accent-teal` ou `.highlight-word`
- [ ] Formulaires utilisent shadcn/ui (stylisé auto)
- [ ] Curseur global fonctionne (cyan → doré)

---

**Tous vos formulaires et pages héritent maintenant de ce système.**
Le curseur personnalisé, les couleurs et les typographies sont appliqués globalement.
