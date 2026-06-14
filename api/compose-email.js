export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { client, oldStatus, newStatus, docTerm, quoteRef, quotation, validDate } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: `You are the email agent for High Rise Interiors, a premium interior design firm in Hyderabad, India.
Write professional, warm, concise client emails.
Always include: client name, ${docTerm} reference, key action required.
Never include pricing breakdowns — the report is attached separately.
Keep emails under 120 words. Sign off as "High Rise Interiors Team".
Respond with JSON only: { "subject": "...", "body": "..." }
No markdown, no backticks, just raw JSON.`,
        messages: [{
          role: "user",
          content: `Write a status update email:

Name: ${client.name}
Project: ${client.projectType || "Residential"} at ${client.address || "Hyderabad"}
${docTerm} Ref: ${quoteRef}
Total Value: ${quotation}
Status changed: ${oldStatus} → ${newStatus}
${newStatus === "Lead" ? `Valid Until: ${validDate} (3 days — URGENT)` : ""}

Context by status:
- Lead: First contact, ${docTerm.toLowerCase()} expires in 3 days, ask to confirm
- Active: Project confirmed, advance payment (35%) needed to start work
- In Progress: Work in progress, share encouragement, mention next payment
- Completed: Work done, thank you, ask for referral using their code: ${client.referralCode || "contact us"}
- On Hold: Acknowledge, reassure, keep warm

Write for status: ${newStatus}`
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
    console.error("compose-email error:", e);
    return res.status(500).json({ error: e.message });
  }
}
