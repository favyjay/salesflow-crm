import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../database/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Gemini AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generates an executive AI summary and deal risk score for a specific lead.
 * Persists the output directly into PostgreSQL.
 */
export const summarizeLead = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;

    // Fetch the lead, including its relational notes table
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { notes: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Concatenate all linked note objects into a single string for Gemini
    const notesText = lead.notes.map(n => n.content).join('; ') || 'No notes logged yet.';

    // Configure Gemini for Structured JSON Outputs
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      You are an expert sales analyst. Analyze the following lead profile and generate:
      1. A concise 2-sentence executive summary.
      2. A deal risk score (an integer from 0 to 100, where 0 is no risk and 100 is high risk of losing).
      3. One concrete, actionable next best step to convert them.

      Lead Profile:
      - Contact Name: ${lead.name}
      - Company: ${lead.company}
      - Email: ${lead.email || 'Not provided'}
      - Phone: ${lead.phone || 'Not provided'}
      - Value: $${lead.value}
      - Current Stage: ${lead.status}
      - Source: ${lead.source || 'Unknown'}
      - Notes: ${notesText}

      Return your response STRICTLY as a JSON object with this structure:
      {
        "summary": "string",
        "riskScore": number,
        "nextStep": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text());

    // Persist the AI outputs directly in PostgreSQL
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        aiSummary: aiResponse.summary,
        aiRiskScore: aiResponse.riskScore,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Lead analyzed successfully',
      aiSummary: updatedLead.aiSummary,
      aiRiskScore: updatedLead.aiRiskScore,
      nextStep: aiResponse.nextStep,
    });
  } catch (error) {
    console.error('AI lead summary error:', error);
    return res.status(500).json({ error: 'Internal server error generating AI summary' });
  }
};

/**
 * Drafts a highly personalized sales email tailored to a lead's profile.
 */
export const generateEmail = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const { id } = req.params;
    const { purpose, tone } = req.body; // e.g. purpose: "Follow-up", tone: "Professional"

    // Fetch the lead, including its relational notes table
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { notes: true }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Concatenate all linked note objects into a single string for Gemini
    const notesText = lead.notes.map(n => n.content).join('; ') || 'No notes logged yet.';

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Write a highly personalized sales email from the representative (${req.user.name} at ${req.user.company || 'SalesFlow CRM'}) to the following lead.

      Parameters:
      - Email Purpose: ${purpose || 'Follow-up'}
      - Tone: ${tone || 'Professional & Friendly'}

      Lead Profile:
      - Name: ${lead.name}
      - Company: ${lead.company}
      - Estimated Value: $${lead.value}
      - Current Stage: ${lead.status}
      - Notes Context: ${notesText}

      Return your response STRICTLY as a JSON object with this structure:
      {
        "subject": "string",
        "body": "string"
      }
    `;

    const result = await model.generateContent(prompt);
    const emailDraft = JSON.parse(result.response.text());

    return res.status(200).json({
      success: true,
      subject: emailDraft.subject,
      body: emailDraft.body,
    });
  } catch (error) {
    console.error('AI email generation error:', error);
    return res.status(500).json({ error: 'Internal server error generating email draft' });
  }
};

/**
 * Scans all workspace deals and generates full-pipeline executive analytics.
 */
export const analyzePipeline = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    // Fetch all active deals in the workspace
    const deals = await prisma.deal.findMany({
      include: { customer: { select: { name: true } } },
    });

    if (deals.length === 0) {
      return res.status(200).json({
        success: true,
        healthScore: 100,
        observations: ['No active deals inside the pipeline yet.'],
        recommendations: ['Register some leads and opportunities to trigger AI recommendations.'],
      });
    }

    const serializedDeals = deals.map(d => ({
      title: d.title,
      value: d.value,
      stage: d.stage,
      client: d.customer.name,
    }));

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
      Analyze the following sales pipeline database and generate an executive health report.
      Identify conversion bottlenecks, deal distributions, and flag high-value opportunities.

      Pipeline Data:
      ${JSON.stringify(serializedDeals, null, 2)}

      Return your response STRICTLY as a JSON object with this structure:
      {
        "healthScore": number, // an integer from 0 to 100
        "observations": ["string", "string"], // 3-4 observations
        "recommendations": ["string", "string"] // 3-4 actionable steps to increase close rates
      }
    `;

    const result = await model.generateContent(prompt);
    const report = JSON.parse(result.response.text());

    return res.status(200).json({
      success: true,
      healthScore: report.healthScore,
      observations: report.observations,
      recommendations: report.recommendations,
    });
  } catch (error) {
    console.error('AI pipeline analysis error:', error);
    return res.status(500).json({ error: 'Internal server error generating pipeline insights' });
  }
};