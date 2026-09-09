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
You are an expert construction BOQ technical proofreader.
Carefully review each entry below. You MUST detect and correct:
1. Spelling errors (e.g., "Suply" -> "Supply", "fabricatition" -> "Fabrication", "recieved" -> "received").
2. Unnecessary word repetition (e.g., "making civil foundation... Civil foundation").
3. Technical abbreviations and casing (e.g., "sqmm" -> "sq.mm", "cbl" -> "Cable", "mtr" -> "Meter", "ltr" -> "Liter").
${catalogContext}
STRICT CONSTRAINTS:
- Do NOT modify, round, or omit numbers, dimensions, or engineering grades (e.g. Fe500D, M25, 415V, 3C x 2.5).
- If any correction is made to itemName or description, set "changesMade": true.

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
    "correctedItemName": "corrected item name string",
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