import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedRfp {
  title: string;
  description: string;
  budget?: number;
  currency?: string;
  deadline?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    specifications?: Record<string, any>;
  }>;
  additionalRequirements?: Record<string, any>;
  summary: string;
}

export interface ParsedProposal {
  totalPrice?: number;
  currency?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  validityPeriod?: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    specifications?: Record<string, any>;
  }>;
  additionalTerms?: Record<string, any>;
  summary: string;
  confidence: number;
}

export interface ProposalEvaluation {
  overallScore: number;
  scoreBreakdown: {
    priceScore: number;
    deliveryScore: number;
    termsScore: number;
    completenessScore: number;
    complianceScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  comparisonNotes?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.gemini.apiKey');
    this.model = this.configService.get<string>('ai.gemini.model') || 'gemini-2.0-flash';
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('Gemini API key not configured');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateJSON<T>(prompt: string, maxRetries = 5): Promise<T> {
    if (!this.genAI) {
      throw new Error('Gemini API not configured');
    }

    const model = this.genAI.getGenerativeModel({ model: this.model });
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        } else {
          // Try to find JSON object directly
          const objMatch = text.match(/\{[\s\S]*\}/);
          if (objMatch) {
            jsonStr = objMatch[0];
          }
        }
        
        return JSON.parse(jsonStr) as T;
      } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error (429)
        const errorMessage = error.message || '';
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('Resource exhausted')) {
          const backoffSchedule = [1000, 30000, 60000, 90000]; // 1s, 30s, 60s, 90s
          const backoffMs = backoffSchedule[Math.min(attempt, backoffSchedule.length - 1)]; // Cap at 90s
          this.logger.warn(`Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in ${backoffMs / 1000}s...`);
          await this.sleep(backoffMs);
        } else {
          // For non-rate-limit errors, throw immediately
          throw error;
        }
      }
    }
    
    this.logger.error(`Failed after ${maxRetries} attempts due to rate limiting`);
    throw lastError;
  }

  /**
   * Parse natural language input into a structured RFP
   */
  async parseNaturalLanguageToRfp(userInput: string): Promise<ParsedRfp> {
    const prompt = `You are an expert procurement assistant. Parse the following natural language procurement request into a structured RFP.

USER INPUT:
"${userInput}"

Extract and return a JSON object with this exact structure:
{
  "title": "A concise title for the RFP",
  "description": "Clear description of what is being procured",
  "budget": number or null,
  "currency": "currency code as mentioned by user (e.g., USD, EUR, GBP, INR, etc.)" or null if not specified,
  "deadline": "YYYY-MM-DD" or null,
  "deliveryDays": number or null,
  "paymentTerms": "string" or null,
  "warrantyTerms": "string" or null,
  "items": [
    {
      "name": "item name",
      "description": "item description",
      "quantity": number,
      "unit": "units/pieces/etc",
      "specifications": { "key": "value" }
    }
  ],
  "additionalRequirements": { "key": "value" } or null,
  "summary": "A brief professional summary for sending to vendors"
}

Be thorough in extracting specifications. IMPORTANT: Extract the currency exactly as the user specifies it (e.g., $=USD, ₹=INR, €=EUR, £=GBP, ¥=JPY). If the user uses currency symbols like $, ₹, €, £, convert them to their ISO currency codes. If no currency is mentioned at all, leave currency as null.
Return ONLY the JSON object, no additional text.`;

    try {
      return await this.generateJSON<ParsedRfp>(prompt);
    } catch (error) {
      this.logger.error('Failed to parse RFP:', error);
      throw error;
    }
  }

  /**
   * Parse vendor email response into structured proposal data
   */
  async parseVendorResponse(
    emailBody: string,
    attachmentContents: string[],
    rfpContext: {
      title: string;
      items: Array<{ name: string; quantity: number; specifications?: Record<string, any> }>;
      budget?: number;
    },
  ): Promise<ParsedProposal> {
    const prompt = `You are an expert procurement analyst. Parse this vendor proposal response into structured data.

RFP CONTEXT:
Title: "${rfpContext.title}"
Budget: ${rfpContext.budget ? `${rfpContext.budget}` : 'Not specified'}
Items Required:
${JSON.stringify(rfpContext.items, null, 2)}

VENDOR EMAIL:
${emailBody}

${attachmentContents.length > 0 ? `ATTACHMENT CONTENTS:\n${attachmentContents.join('\n\n---\n\n')}` : ''}

Extract and return a JSON object with this structure:
{
  "totalPrice": number or null,
  "currency": "currency code as mentioned in the proposal (e.g., USD, EUR, INR)" or null,
  "deliveryDays": number or null,
  "paymentTerms": "string" or null,
  "warrantyTerms": "string" or null,
  "validityPeriod": "string" or null,
  "items": [
    {
      "name": "string",
      "description": "string",
      "quantity": number,
      "unitPrice": number or null,
      "totalPrice": number or null,
      "specifications": { "key": "value" }
    }
  ],
  "additionalTerms": { "key": "value" } or null,
  "summary": "Brief summary of the proposal",
  "confidence": number (0-100, your confidence in parsing accuracy)
}

Match items to RFP items where possible. Return ONLY the JSON object.`;

    try {
      return await this.generateJSON<ParsedProposal>(prompt);
    } catch (error) {
      this.logger.error('Failed to parse vendor response:', error);
      throw error;
    }
  }

  /**
   * Evaluate a single proposal against RFP requirements
   */
  async evaluateProposal(
    proposal: ParsedProposal,
    rfpContext: {
      title: string;
      budget?: number;
      deliveryDays?: number;
      paymentTerms?: string;
      warrantyTerms?: string;
      items: Array<{ name: string; quantity: number; specifications?: Record<string, any> }>;
    },
  ): Promise<ProposalEvaluation> {
    const prompt = `You are an expert procurement evaluator. Score this vendor proposal against the RFP requirements.

RFP REQUIREMENTS:
Title: ${rfpContext.title}
Budget: ${rfpContext.budget ? `${rfpContext.budget}` : 'Not specified'}
Required Delivery: ${rfpContext.deliveryDays ? `${rfpContext.deliveryDays} days` : 'Not specified'}
Payment Terms: ${rfpContext.paymentTerms || 'Not specified'}
Warranty Required: ${rfpContext.warrantyTerms || 'Not specified'}
Items: ${JSON.stringify(rfpContext.items, null, 2)}

VENDOR PROPOSAL:
${JSON.stringify(proposal, null, 2)}

Score the proposal on these criteria (0-100 each):
1. priceScore: How competitive vs budget?
2. deliveryScore: Meets delivery timeline?
3. termsScore: Payment/warranty acceptable?
4. completenessScore: All items included?
5. complianceScore: Overall RFP compliance?

Return a JSON object:
{
  "overallScore": number (weighted average),
  "scoreBreakdown": {
    "priceScore": number,
    "deliveryScore": number,
    "termsScore": number,
    "completenessScore": number,
    "complianceScore": number
  },
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendation": "Brief recommendation text"
}

Return ONLY the JSON object.`;

    try {
      return await this.generateJSON<ProposalEvaluation>(prompt);
    } catch (error) {
      this.logger.error('Failed to evaluate proposal:', error);
      throw error;
    }
  }

  /**
   * Compare multiple proposals and recommend a vendor
   */
  async compareProposalsAndRecommend(
    proposals: Array<{
      vendorName: string;
      proposal: ParsedProposal;
      evaluation: ProposalEvaluation;
    }>,
    rfpContext: {
      title: string;
      budget?: number;
      items: Array<{ name: string; quantity: number }>;
      priorities?: string[];
    },
  ): Promise<{
    recommendedVendor: string;
    reasoning: string;
    comparisonSummary: string;
    rankings: Array<{ vendorName: string; rank: number; summary: string }>;
  }> {
    const prompt = `You are an expert procurement advisor. Compare these vendor proposals and recommend the best option.

RFP: ${rfpContext.title}
Budget: ${rfpContext.budget ? `${rfpContext.budget}` : 'Not specified'}
${rfpContext.priorities ? `Priorities: ${rfpContext.priorities.join(', ')}` : ''}

PROPOSALS AND EVALUATIONS:
${JSON.stringify(proposals, null, 2)}

Provide a recommendation with:
1. Which vendor to choose
2. Detailed reasoning
3. Summary comparing all vendors
4. Rankings with brief summaries

Return a JSON object:
{
  "recommendedVendor": "vendor name",
  "reasoning": "detailed reasoning",
  "comparisonSummary": "summary of comparison",
  "rankings": [
    { "vendorName": "name", "rank": 1, "summary": "brief summary" }
  ]
}

Return ONLY the JSON object.`;

    try {
      return await this.generateJSON(prompt);
    } catch (error) {
      this.logger.error('Failed to compare proposals:', error);
      throw error;
    }
  }

  /**
   * Generate a professional RFP email from structured data
   */
  async generateRfpEmail(
    rfp: ParsedRfp,
    vendorName: string,
  ): Promise<{ subject: string; body: string }> {
    const prompt = `Generate a professional RFP email to send to ${vendorName}.

RFP DETAILS:
Title: ${rfp.title}
Description: ${rfp.description}
Budget: ${rfp.budget ? `${rfp.currency || ''} ${rfp.budget}` : 'To be quoted'}
Deadline: ${rfp.deadline || 'As soon as possible'}
Delivery Required: ${rfp.deliveryDays ? `Within ${rfp.deliveryDays} days` : 'To be proposed'}
Payment Terms: ${rfp.paymentTerms || 'Standard terms acceptable'}
Warranty Required: ${rfp.warrantyTerms || 'Please specify'}

Items Required:
${rfp.items.map((item, i) => `${i + 1}. ${item.name} - Qty: ${item.quantity}${item.specifications ? ` - Specs: ${JSON.stringify(item.specifications)}` : ''}`).join('\n')}

${rfp.additionalRequirements ? `Additional Requirements: ${JSON.stringify(rfp.additionalRequirements)}` : ''}

The email should be professional, clear, and include all relevant details.
Do not use placeholder text like [Your Name].

Return a JSON object:
{
  "subject": "Email subject line",
  "body": "Full email body"
}

Return ONLY the JSON object.`;

    try {
      return await this.generateJSON(prompt);
    } catch (error) {
      this.logger.error('Failed to generate RFP email:', error);
      throw error;
    }
  }
}
