# 🎯 UI Kit — /user/ Routes Design System

## Color Palette

### Primary Color (Interactive)
```
Cyan: #00E5FF
Used for: Buttons, links, active states, interactive elements
Glow: rgba(0, 229, 255, 0.3-0.5)
```

### Accent Color (Premium)
```
Gold: #C9A84E
Used for: Section titles, premium badges
Glow: rgba(201, 168, 78, 0.2)
⚠️  NEVER use for body text or alongside cyan
```

### Backgrounds
```
Primary:  #0D0D0D   (main background)
Surface:  #1A1A1A   (cards, panels)
Hover:    #222222   (interactive hover state)
Border:   #2A2A2A   (subtle borders)
Border2:  #333333   (medium borders)
```

### Text Hierarchy
```
Primary:      #EAEAEA (100% - main text)
Secondary:    rgba(234,234,234,0.8) (80% - secondary info)
Tertiary:     rgba(255,255,255,0.4) (40% - labels, hints)
Very subtle:  #808080 (gray - disabled states)
```

---

## Component Styles

### Buttons

**Primary Button (Cyan)**
```
Background: var(--s2)
Border: 1.5px solid var(--cy)
Text: var(--cy) + font-weight: 700
Glow: 0 0 10px rgba(0, 229, 255, 0.2)
Hover/Active: Background var(--s3) + stronger glow
```

**Secondary Button (Quiet)**
```
Background: transparent
Border: 1px solid var(--br2)
Text: var(--txd)
Glow: none
Hover: Background rgba(0, 229, 255, 0.08) + cyan text
```

### Navigation

**Active Nav Item**
```
Dot: var(--cy) + cyPulse animation (1.5s)
Label: var(--cy) + font-weight: 700
Line: var(--cy) + subtle glow
```

**Inactive Nav Item**
```
Dot: var(--br2) (no animation)
Label: var(--txd) + font-weight: 600
Line: transparent
```

### Cards

**Default Card**
```
Background: var(--s2)
Border: 1px solid var(--br2)
Padding: 16px 14px
Transition: all 0.2s
```

**Card Hover/Active**
```
Background: var(--s3)
Border: 1px solid var(--cy)
Glow: 0 0 8px rgba(0, 229, 255, 0.2)
```

### Notifications

**Notification Banner**
```
Background: var(--s2)
Border-left: 2px solid var(--cy)
Icon: cyPulse animation
Title: var(--tx) + font-weight: 500
CTA: var(--cy) + font-weight: 700 + glow
```

### Checkboxes

**Unchecked**
```
Border: 1.5px solid var(--br2)
Background: transparent
Idle animation: NONE (no pulsing)
```

**Checked**
```
Background: var(--cy)
Border: var(--cy)
Glow: 0 0 8px rgba(0, 229, 255, 0.4)
Text strikethrough: var(--txd)
```

---

## Typography

### Fonts
```
Headers:   'Bebas Neue' (var(--fh2))
Body:      'Public Sans' (var(--fb))
Accent:    'DM Sans' (var(--fh))
```

### Sizes
```
Hero Title:        2.375rem (38px) | Bold | Gold | Subtle shadow
Section Header:    1rem (16px) | Bold 700 | White
Subheading:        0.6875rem (11px) | Weight 500 | var(--tx)
Label:             0.5rem (8px) | Weight 500 | var(--txd)
Pill button:       0.5625rem (9px) | Weight 700 | Cyan when active
```

---

## Animations

### Subtle Glow (cyPulse)
```
Duration: 1.5s
Loop: infinite
Type: ease-in-out
0%, 100%: 0 0 6px rgba(0,229,255,0.3), 0 0 12px rgba(0,229,255,0.1)
50%:      0 0 10px rgba(0,229,255,0.5), 0 0 18px rgba(0,229,255,0.15)
```

### Steady Glow (cyGlow)
```
No animation
Static: 0 0 8px rgba(0,229,255,0.4)
```

### Gold Glow (gGlow)
```
No animation
Static: 0 0 6px rgba(201,168,78,0.3)
Used sparingly on premium elements
```

---

## Whats NOT Allowed

❌ **Cyan + Gold side by side** — Creates visual conflict  
❌ **Gold on body text** — Too harsh on black background  
❌ **Cyan for long text content** — Eye fatigue after reading  
❌ **Intense animations everywhere** — Overwhelming  
❌ **Pure white text on black** — Use #EAEAEA instead  
❌ **Multiple animation states** — Stick to 1 primary animation per element  

---

## DO's

✅ **Use opacity for hierarchy**  
✅ **Prefer size + weight over color**  
✅ **Add subtle glows sparingly**  
✅ **Create surfaces with depth**  
✅ **Keep animations subtle (1.5s/2s max)**  
✅ **Maintain high contrast for accessibility**  
✅ **Use cyan for all interactive elements**  
✅ **Reserve gold for important titles**  

---

## Implementation Checklist

- [x] Updated design tokens in CSS
- [x] Refactored keyframes (removed intense animations)
- [x] Updated button colors to cyan
- [x] Updated navigation to cyan with subtle pulse
- [x] Changed checkboxes to cyan when done
- [x] Updated cards with proper surfaces
- [x] Added opacity hierarchy for text
- [x] Removed gold from interactive elements
- [x] Simplified gradients to cyan theme
- [ ] Test on mobile devices
- [ ] Verify accessibility (WCAG AA)
- [ ] Check animation performance
- [ ] Get user feedback

---

**Last Updated:** 2026-04-16  
**Status:** ✅ Merged to `/user/` layout
