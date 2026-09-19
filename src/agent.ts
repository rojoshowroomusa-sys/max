import { Think, type SkillSource } from "@cloudflare/think";
import { createWorkersAI } from "workers-ai-provider";
import { getMaxSkillsSource } from "./skills/manifest.js";

export class MaxAgent extends Think<Env> {
  getModel() {
    return createWorkersAI({ binding: this.env.AI })("@cf/meta/llama-3.3-70b-instruct");
  }

  getSystemPrompt() {
    return `Sos el asistente inteligente de MAX Carnes Premium, una tienda online de carnes premium argentinas.
Tu objetivo es asesorar a los clientes sobre cortes, puntos de cocción, armado de combos y cálculo de porciones para asados, facilitando el pedido por WhatsApp.
Utilizá tus habilidades (Agent Skills) activándolas cuando el usuario consulte sobre el catálogo, recetas o armado de pedidos.`;
  }

  getSkills(): SkillSource[] {
    return [getMaxSkillsSource()];
  }
}
