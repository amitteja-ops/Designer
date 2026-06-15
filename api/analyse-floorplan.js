export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { base64, mediaType } = req.body;
    if (!base64) return res.status(400).json({ error: "No image data" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64 }
            },
            {
              type: "text",
              text: `Analyse this floor plan image carefully. Read all room labels and dimension text visible on the plan.

Return ONLY valid JSON (no markdown, no explanation):
{
  "rooms": ["Master Bedroom", "Bedroom 2", "Living Room", "Kitchen"],
  "dimensions": {
    "Master Bedroom": { "length": "14.8", "width": "12.4", "height": "9" },
    "Bedroom 2":      { "length": "13.3", "width": "11.7", "height": "9" },
    "Living Room":    { "length": "13.8", "width": "12.5", "height": "9" },
    "Kitchen":        { "length": "8.0",  "width": "12.4", "height": "9" }
  },
  "notes": "3 BHK flat, approx 1780 sq ft, Hyderabad"
}

Critical rules:
- Read the EXACT dimension text printed on the floor plan (e.g. "13'3 x 11'8" means length=13.3, width=11.7 in feet)
- Convert feet+inches to decimal feet: 13'3" = 13.25, 11'8" = 11.67
- Include ALL visible rooms: bedrooms, bathrooms/toilets, kitchen, living, dining, balcony, utility, puja, hallway, sitout, dressing
- For rooms with only width shown (e.g. "5'0 WIDE"), use that as width and estimate depth from plan proportions
- Default height = 9 feet if not stated
- Use the exact room names shown on the plan`
            }
          ]
        }]
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || "API error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (e) {
    console.error("analyse-floorplan error:", e);
    return res.status(500).json({ error: e.message });
  }
}
