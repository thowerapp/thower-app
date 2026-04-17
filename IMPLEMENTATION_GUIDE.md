# 🔧 Implementation Guide — UI Updates for /user/ Routes

## Quick Reference

### The Rule: ONE Dominant Color

**Before:** Cyan + Gold competing equally → **Confusing**  
**After:** Cyan is primary, Gold is accent only → **Clear hierarchy**

---

## Color Usage by Component Type

### 🟦 Buttons & Links (Interactive)
- **Border:** `var(--cy)` (#00E5FF)
- **Text:** `var(--cy)`
- **Hover:** Add background `var(--s3)` + glow
- **Active:** Stronger glow, slightly darker background
- **Glow:** `0 0 8px rgba(0, 229, 255, 0.3)`
- ❌ Never use gold for buttons

### 📌 Navigation
- **Active item:** Cyan dot + text + underline
- **Inactive:** Gray (`var(--txd)`) text, no dot
- **Pending state:** Cyan (was gold, now changed)
- **Animation:** `cyPulse` (1.5s, subtle)

### 🎴 Cards & Surfaces
- **Background:** `var(--s2)` normally, `var(--s3)` on hover
- **Border:** `var(--br2)` normally, `var(--cy)` on hover
- **Hover effect:** Add `0 0 8px rgba(0, 229, 255, 0.2)`
- **Transition:** `all 0.2s` (smooth, not instant)

### ☑️ Checkboxes & Forms
- **Unchecked:** Border `var(--br2)`, no animation
- **Checked:** Background `var(--cy)`, glow `0 0 8px rgba(0, 229, 255, 0.4)`
- **Disabled:** Border `var(--txd)`, no animation
- **Text when checked:** Strikethrough + `var(--txd)`

### 📢 Notifications
- **Border-left:** `var(--cy)` (was gold, now cyan)
- **Icon dot:** `cyPulse` animation
- **CTA text:** `var(--cy)` + bold + glow
- **Background:** `var(--s2)` with subtle depth

### 🎯 Titles & Headings
- **Hero title:** Gold `var(--g)` with subtle shadow
- **Section headers:** White `var(--tx)` + bold (700 weight)
- **Subtitles:** Gray `var(--txd)`
- ✅ Gold ONLY on main titles

### 💬 Text & Content
- **Primary (100%):** `var(--tx)` = #EAEAEA
- **Secondary (80%):** `rgba(234, 234, 234, 0.8)`
- **Tertiary (40%):** `var(--txd)` = `rgba(255, 255, 255, 0.4)`
- **Labels:** Use 40-60% opacity for clear hierarchy

---

## DO's & DON'Ts

### ✅ DO
```css
/* Good: Clear hierarchy */
.button {
  color: var(--cy);        /* Cyan for interactive */
  border: 1px solid var(--cy);
  background: var(--s2);   /* Dark surface */
}

/* Good: Text hierarchy */
.label {
  color: var(--txd);       /* 40% transparent */
  font-size: 0.5rem;       /* Small */
}

/* Good: Subtle animations */
.button:hover {
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.4); /* Subtle glow */
  animation: cyPulse 1.5s ease-in-out infinite; /* Smooth */
}

/* Good: Gold only on titles */
.title {
  color: var(--g);         /* Only here */
  font-weight: 700;        /* Bold for importance */
}
```

### ❌ DON'T
```css
/* Bad: Cyan text on long content */
.article { color: var(--cy); }  /* Eye strain! */

/* Bad: Competing with cyan */
.button { 
  color: var(--g);  /* Cyan is the action color, not gold */
  box-shadow: 0 0 20px rgba(200,130,20,1); /* Too intense */
}

/* Bad: Pure white */
body { color: #FFFFFF; }  /* Use #EAEAEA instead */

/* Bad: Cyan + Gold together */
.button {
  background: var(--cy);
  border: 1px solid var(--g);  /* Clashing colors */
}

/* Bad: Intense animations */
@keyframes pulse {
  50% { box-shadow: 0 0 40px rgba(0, 229, 255, 0.9); } /* Too much */
}
```

---

## Creating New Components

### Template: Button Component
```svelte
<button class="btn btn-primary">Click me</button>

<style>
  .btn {
    background: var(--s2);
    border: 1px solid var(--br2);
    color: var(--tx);
    padding: 10px 16px;
    border-radius: 4px;
    transition: all 0.2s;
    cursor: pointer;
  }
  
  .btn-primary {
    border-color: var(--cy);
    color: var(--cy);
    font-weight: 700;
  }
  
  .btn-primary:hover {
    background: var(--s3);
    border-color: var(--cy);
    box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  }
  
  .btn-primary:active {
    background: var(--s3);
    box-shadow: 0 0 12px rgba(0, 229, 255, 0.5);
  }
</style>
```

### Template: Card Component
```svelte
<div class="card">
  <h3 class="card-title">Card Title</h3>
  <p class="card-text">Content here</p>
</div>

<style>
  .card {
    background: var(--s2);
    border: 1px solid var(--br2);
    border-radius: 8px;
    padding: 16px;
    transition: all 0.2s;
  }
  
  .card:hover {
    background: var(--s3);
    border-color: var(--cy);
    box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
  }
  
  .card-title {
    color: var(--tx);
    font-weight: 700;
    margin: 0 0 8px 0;
  }
  
  .card-text {
    color: var(--tx2);
    font-size: 0.875rem;
  }
</style>
```

### Template: Active/Pending State
```svelte
<div class="item" class:active={isActive} class:pending={isPending}>
  Content
</div>

<style>
  .item {
    border: 1px solid var(--br2);
    color: var(--tx);
  }
  
  .item.active {
    border-color: var(--cy);
    box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
  }
  
  .item.pending {
    animation: cyPulse 1.5s ease-in-out infinite;
  }
</style>
```

---

## Testing Checklist

Before submitting changes, verify:

- [ ] **Colors**: Use only cyan for interactive, gold for titles
- [ ] **Contrasts**: Text is readable on dark backgrounds
- [ ] **Animations**: 1.5s-2s, subtle glows only
- [ ] **Opacity**: Labels use 40% transparency
- [ ] **Hover states**: Cards/buttons show cyan border + glow
- [ ] **Mobile**: Styles work on small screens
- [ ] **Accessibility**: WCAG AA standards for contrast
- [ ] **Performance**: No excessive animations (< 3 animating elements per screen)

---

## Migration Checklist

For existing components, apply these changes:

- [ ] Replace `var(--g)` with `var(--cy)` in interactive elements
- [ ] Remove intense glow effects from non-title elements
- [ ] Update pending badges to cyan instead of gold
- [ ] Ensure text uses proper opacity hierarchy
- [ ] Add subtle shadows to card hover states
- [ ] Update navigation active state colors
- [ ] Remove gold from button states (keep it for titles only)
- [ ] Test all interactive states (hover, active, disabled)

---

## Color Swatches (Copy/Paste)

```
Primary cyan:        #00E5FF
Accent gold:         #C9A84E
Dark background:     #0D0D0D
Canvas surface:      #1A1A1A
Hover surface:       #222222
Primary text:        #EAEAEA
Secondary text:      rgba(234, 234, 234, 0.8)
Tertiary text:       rgba(255, 255, 255, 0.4)
Subtle border:       #2A2A2A
Medium border:       #333333
```

---

## Need Help?

Refer to:
- **UI_IMPROVEMENTS_SUMMARY.md** — Overview of all changes
- **UI_KIT.md** — Full design system documentation
- **src/routes/user/+layout.svelte** — Implementation reference

---

**Version:** 1.0  
**Last Updated:** 2026-04-16  
**Status:** Ready for implementation
