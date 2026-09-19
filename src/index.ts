import { routeAgentRequest } from "agents";
import { MaxAgent } from "./agent.js";

export { MaxAgent };

// Prompts fotográficos profesionales para cada corte
const MEAT_PROMPTS: Record<string, string> = {
  vacio:
    "Professional commercial culinary photography of raw Argentine Vacio beef flank cut, rich marbled meat texture with thin outer fat layer, on a rustic dark wooden butcher board, coarse parrillera sea salt, fresh rosemary, dark slate background, warm studio lighting, 85mm macro lens, 4k ultra realistic.",
  "tapa-asado":
    "Commercial food photography of raw Argentine Tapa de Asado beef rib cap cut, beautiful marbling and fat layer, placed on dark oak board, butcher knife beside, coarse salt crystals, dramatic lighting, sharp focus, 4k resolution.",
  matambre:
    "Gourmet culinary shot of raw Argentine Matambre cut, flat tender beef layer, garnished with whole peppercorns and fresh oregano on dark stone counter, commercial food styling, studio lighting.",
  entrana:
    "Macro commercial food photography of fresh Argentine Entraña skirt steak, raw meat texture, thin and tender, on rustic parrillero board, sea salt, dramatic warm lighting, shallow depth of field.",
  lomo:
    "High-end luxury commercial culinary photo of raw Argentine Lomo beef tenderloin filet mignon cut, extra tender lean red meat, on dark slate board with rosemary sprig, 85mm lens, 4k photorealistic.",
  "ojo-bife":
    "Gourmet food photography of raw Ribeye Ojo de Bife steak, beautiful intramuscular marbling with circular fat core, on dark butcher block with sea salt crystals, warm restaurant lighting, 4k.",
  "bife-chorizo":
    "Commercial photography of raw Argentine Bife de Chorizo striploin steak, thick cut with lateral fat strip, on rustic cutting board, fresh herbs, professional culinary lighting, ultra-detailed.",
  tomahawk:
    "Commercial dramatic food photo of raw Tomahawk ribeye steak with long bone, rich marbling on rustic parrillero grill table, coarse salt, dark moody background, high resolution.",
  "t-bone":
    "Commercial food photo of raw Argentine T-Bone steak, T-shaped bone separating tenderloin and strip, on butcher wooden board, coarse sea salt, studio lighting.",
  picana:
    "Culinary photography of raw Picaña beef rump cap with thick white fat cap, on wooden block, sea salt, restaurant food styling, 4k sharp focus.",
  default:
    "Professional commercial culinary photography of premium raw Argentine beef meat cut, marbled texture, on rustic dark wooden board, coarse sea salt, fresh herbs, dramatic studio lighting, 4k ultra realistic.",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1) Enrutamiento de peticiones del agente (ej. /agents/max-agent/:id)
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    const url = new URL(request.url);

    // 2) Estado del agente
    if (url.pathname === "/api/agent/status") {
      return new Response(
        JSON.stringify({
          status: "active",
          agent: "MaxAgent",
          runtime: "Cloudflare Agents SDK (@cloudflare/think)",
          skills: ["carnes-catalogo", "recetas-asado", "pedidos-whatsapp"],
          imageModels: [
            "@cf/black-forest-labs/flux-1-schnell",
            "@cf/stabilityai/stable-diffusion-xl-base-1.0",
          ],
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 3) Generación de fotos de carnes vía Workers AI (FLUX / SDXL)
    if (url.pathname.startsWith("/api/photo/")) {
      const cutId = url.pathname.replace("/api/photo/", "").toLowerCase();
      const prompt = MEAT_PROMPTS[cutId] || MEAT_PROMPTS.default;

      try {
        const response: any = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt,
          steps: 4,
        });

        // Flux-1-schnell en Workers AI retorna { image: "base64..." } o stream binario
        if (response && response.image) {
          const binary = Uint8Array.from(atob(response.image), (c) => c.charCodeAt(0));
          return new Response(binary, {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=86400",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        return new Response(response, {
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            error: "No se pudo generar la foto con Workers AI",
            details: err?.message || String(err),
            promptUsed: prompt,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
