import Anthropic from "@anthropic-ai/sdk";
import dbConnect from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";

async function getAnthropicClient(companyId) {
    await dbConnect();
    let apiKey = "";

    if (companyId) {
        const settings = await CompanySettings.findOne({ companyId })
            .select("anthropicApiKey")
            .lean();
        if (settings?.anthropicApiKey) {
            apiKey = settings.anthropicApiKey;
        }
    }

    apiKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error("Anthropic API key is not configured. Add your key in Settings.");
    }

    return new Anthropic({ apiKey });
}

/**
 * Cleans an array of items in a single prompt with Item Master cross-referencing
 * @param {string} companyId - Company ID for API key resolution
 * @param {Array} itemsBatch - Array of { id, itemName, description }
 * @param {Array<string>} [masterCatalogNames=[]] - List of approved Item Master names
 */
export async function batchCorrectItemsWithClaude(companyId, itemsBatch, masterCatalogNames = []) {
    if (!itemsBatch || itemsBatch.length === 0) return [];

    const anthropic = await getAnthropicClient(companyId);

    // Provide catalog reference block only if catalog items exist
    const catalogContext = masterCatalogNames.length > 0
        ? `
APPROVED COMPANY ITEM MASTER LIST:
${JSON.stringify(masterCatalogNames.slice(0, 150))}

ITEM MASTER MATCHING RULE:
- If an input item name closely resembles or is a misspelled / shorthand variant of an item from the "APPROVED COMPANY ITEM MASTER LIST" above, standardize "correctedItemName" to match the EXACT string from that list.
`
        : "";

    const prompt = `
You are a strict, conservative construction BOQ technical proofreader and item matcher.

PRIMARY DIRECTIVE:
You are ONLY fixing typographic/spelling errors and standardizing casing/abbreviations. You are STRICTLY FORBIDDEN from substituting the core physical noun/object under any circumstances.

CRITICAL IDENTITY & OBJECT INTEGRITY RULES:
1. NEVER change what the object physically is:
   - "LIGHTING POLES" must REMAIN "Lighting Poles" (or "LIGHTING POLE"). It MUST NEVER become "Lighting Fixtures", "Luminaires", or "Lamps".
   - A structural pole is NOT a fixture. A bracket is NOT a pole. A conduit is NOT a cable. A pump is NOT a motor.
   - If raw text says "POLE", the output itemName MUST retain "Pole".
2. NO SYNONYM DRIFT: Do not generalize specific items into generic categories (e.g., do not turn "Street Light Pole" into "Lighting System").

SCOPE OF ALLOWED CORRECTIONS:
1. Spelling typos (e.g., "Suply" -> "Supply", "fabricatition" -> "Fabrication", "recieved" -> "received").
2. Technical unit formatting (e.g., "sqmm" -> "sq.mm", "cbl" -> "Cable", "mtr" -> "Meter", "ltr" -> "Liter").
3. Repeated phrase cleanups (e.g., "Civil work... Civil work").
4. Casing standardization (Title Case or Standard Technical Casing).

STRICT PRESERVATION CONSTRAINTS:
- Keep ALL numbers, ratings, grades, and dimensions 100% exact (e.g., Fe500D, M25, 415V, 3C x 2.5, 9 Mtr, IP66).
- Do NOT modify, round, or omit numbers, ratings, dimensions, or engineering grades (e.g., Fe500D, M25, 415V, 3C x 2.5, 9 Mtr, IP66).
- ACRONYM INTEGRITY: NEVER alter letters, plural endings, or characters in technical abbreviations and parenthetical codes (e.g., keep "MCBDBS" exactly as "MCBDBS", do NOT remove or change the trailing 'S').
- If the text is already technically accurate, return it as-is with "changesMade": false.

${catalogContext ? `CATALOG REFERENCE CONSTRAINTS:
${catalogContext}
- Only link to a master catalog item if the physical product type is a 100% IDENTICAL match (Pole matches Pole, Fixture matches Fixture). 
- If no exact physical item exists in the master catalog, set "masterMatch": null and "masterScore": 0. DO NOT force a related category match.` : ""}

Input items:
${JSON.stringify(
        itemsBatch.map((item) => ({
            id: item.id,
            itemName: item.itemName || "",
            description: item.description || "",
        })),
        null,
        2
    )}

Return ONLY a valid JSON array:
[
  {
    "id": "exact input id string",
    "correctedItemName": "corrected item name string (preserve original object noun)",
    "correctedDescription": "corrected description string",
    "changesMade": boolean
  }
]
`;
    try {
        const response = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 3000,
            temperature: 0.1,
            messages: [{ role: "user", content: prompt }],
        });

        const rawOutput = response.content[0]?.text?.trim() || "[]";
        const sanitizedJson = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(sanitizedJson);
    } catch (err) {
        console.error("Batch Claude cleaning error:", err.message);
        return itemsBatch.map((it) => ({
            id: it.id,
            correctedItemName: it.itemName,
            correctedDescription: it.description,
            changesMade: false,
        }));
    }
}