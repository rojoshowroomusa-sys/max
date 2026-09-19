import { fromManifest, type SkillManifest, type SkillSource } from "agents/skills";

export const maxSkillsManifest: SkillManifest = {
  id: "max-carnes-skills-v1",
  fingerprint: "1.0.0",
  skills: [
    {
      name: "carnes-catalogo",
      description: "Consulta de catálogo de cortes vacunos, categorías (Clásicos y Premium) y combos de MAX Carnes Premium.",
      body: `# Catálogo MAX Carnes Premium

Utiliza esta habilidad cuando el usuario pregunte por cortes de carne, stock, características o combos disponibles.

## Cortes Clásicos
- Asado de Tira, Vacío, Matambre, Entraña, Tapa de Asado, Colita de Cuadril, Peceto, Nalga.

## Cortes Premium
- Ojo de Bife, Bife de Chorizo, Lomo, Tomahawk, T-Bone, Picaña.

## Combos Recomendados
1. Combo Asado Clásico
2. Combo Degustación Premium
3. Combo Familiar Semanal

## Políticas de Envío y Pedido
- Envíos sin cargo coordinados por zona.
- Pedidos y cotizaciones directas por WhatsApp.`
    },
    {
      name: "recetas-asado",
      description: "Guía de técnicas de asado, puntos de cocción de la carne argentina (jugoso, a punto, cocido), tiempos y maridajes.",
      body: `# Guía de Cocción y Recetas de Asado Argentino

Aplica esta habilidad para asesorar a los clientes sobre cómo preparar, salar, asar y servir cada corte.

## Puntos de Cocción
- Bleu / Vuelta y Vuelta (45°C - 50°C)
- Jugoso / Sangrante (52°C - 55°C) - Recomendado para Bife de Chorizo y Ojo de Bife
- A Punto (58°C - 62°C) - Equilibrio perfecto
- Cocido / Bien Cocido (+68°C) - Para Asado de Tira o Vacío a fuego lento

## Salado
- Sal entrefina parrillera 15 minutos antes en cortes gruesos.`
    },
    {
      name: "pedidos-whatsapp",
      description: "Asistencia en el armado de pedidos, cálculo de kilos y generación del enlace directo de WhatsApp para MAX Carnes.",
      body: `# Asistente de Pedidos y WhatsApp

Utiliza esta habilidad para asistir al usuario a calcular cantidades para su reunión o asado y formular el pedido.

## Cálculo Estimado de Kilos por Persona
- Adultos (hombres): ~500g sin hueso / ~700g con hueso.
- Adultos (mujeres): ~350g sin hueso / ~500g con hueso.
- Niños: ~200g - 250g.

## Mensaje WhatsApp
Formato con desglose de cortes solicitados, cantidades en kg y kilos totales.`
    }
  ]
};

export function getMaxSkillsSource(): SkillSource {
  return fromManifest(maxSkillsManifest);
}
