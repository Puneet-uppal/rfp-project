export enum RfpStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SENT = 'sent',
  EVALUATING = 'evaluating',
  AWARDED = 'awarded',
  CLOSED = 'closed',
}

export enum ProposalStatus {
  RECEIVED = 'received',
  PARSING = 'parsing',
  PARSED = 'parsed',
  PARSE_FAILED = 'parse_failed',
  EVALUATED = 'evaluated',
  SELECTED = 'selected',
  REJECTED = 'rejected',
}

export enum RfpVendorStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  RESPONDED = 'responded',
  DECLINED = 'declined',
}

export interface RfpItem {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  specifications?: Record<string, unknown>;
}

export interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  address?: string;
  category?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RfpVendor {
  id: string;
  rfpId: string;
  vendorId: string;
  vendor: Vendor;
  status: RfpVendorStatus;
  sentAt?: string;
  respondedAt?: string;
}

export interface Rfp {
  id: string;
  title: string;
  description: string;
  originalInput?: string;
  budget?: number;
  currency?: string;
  deadline?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  additionalRequirements?: Record<string, unknown>;
  status: RfpStatus;
  aiSummary?: string;
  items: RfpItem[];
  rfpVendors?: RfpVendor[];
  proposals?: Proposal[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  currency?: string;
  specifications?: Record<string, unknown>;
}

export interface Proposal {
  id: string;
  rfpId: string;
  vendorId: string;
  vendor: Vendor;
  status: ProposalStatus;
  rawEmailBody?: string;
  emailSubject?: string;
  emailReceivedAt?: string;
  totalPrice?: number;
  currency?: string;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyTerms?: string;
  validityPeriod?: string;
  aiSummary?: string;
  aiScore?: number;
  aiScoreBreakdown?: {
    priceScore?: number;
    deliveryScore?: number;
    termsScore?: number;
    completenessScore?: number;
    complianceScore?: number;
  };
  aiStrengths?: string[];
  aiWeaknesses?: string[];
  aiRecommendation?: string;
  items: ProposalItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonResult {
  rfp: {
    id: string;
    title: string;
    budget?: number;
    currency?: string;
    deliveryDays?: number;
  };
  proposals: Array<{
    id: string;
    vendorName: string;
    vendorId: string;
    totalPrice?: number;
    currency?: string;
    deliveryDays?: number;
    score?: number;
    scoreBreakdown?: Proposal['aiScoreBreakdown'];
    strengths?: string[];
    weaknesses?: string[];
    status: ProposalStatus;
  }>;
  comparison: {
    priceComparison: Array<{
      vendorName: string;
      price?: number;
      percentOfBudget?: number;
      ranking: number;
    }>;
    deliveryComparison: Array<{
      vendorName: string;
      days?: number;
      meetsRequirement: boolean;
      ranking: number;
    }>;
    scoreComparison: Array<{
      vendorName: string;
      score?: number;
      ranking: number;
    }>;
  };
  aiRecommendation?: {
    recommendedVendor: string;
    reasoning: string;
    comparisonSummary: string;
    rankings: Array<{
      vendorName: string;
      rank: number;
      summary: string;
    }>;
  };
}

