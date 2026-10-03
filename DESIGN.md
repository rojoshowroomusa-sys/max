---
version: alpha
name: MAX Carnes Premium
---

## Overview

MAX Carnes Premium es una tienda online de carnes premium argentinas. La paleta se centra en un tono oscuro (#0a0908) con acentos rojos (#dd302b) y un detalle ámbar (#f59e0b). Oswald se usa para titulares y sistema UI para el resto. Contrast AA garantizado.

## Colors

- **primary**: #0a0908 (fondo principal)
- **secondary**: #a8a29e (texto, bordes)
- **accent**: #dd302b (botones, toques de acento)
- **neutral**: #171310 (cards)
- **on-primary**: #faf6f2 (texto sobre fondo oscuro)
- **on-accent**: #ffffff (texto sobre rojo)

typography:
  h1: {fontFamily: Oswald, fontSize: 3.75rem, fontWeight: 700, lineHeight: 1.1, letterSpacing: 0.02em}
  h2: {fontFamily: Oswald, fontSize: 2.625rem, fontWeight: 600, lineHeight: 1.1, letterSpacing: 0.02em}
  h3: {fontFamily: Oswald, fontSize: 1.25rem, fontWeight: 600, lineHeight: 1.3}
  body: {fontFamily: system-ui, fontSize: 1rem, lineHeight: 1.6}
  caption: {fontFamily: system-ui, fontSize: 0.75rem, fontWeight: 700}

spacing:
  0: 0
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  7: 28px
  8: 32px
  9: 36px
  10: 40px

rounded:
  sm: 4px
  md: 8px
  lg: 18px
  full: 9999px

components:
  btn-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.full}"
    padding: 12px
  btn-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 12px
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.full}"
    padding: 8px
  chip-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  stepper-btn:
    width: 34px
    height: 34px
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
---

