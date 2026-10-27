export type LeadStatus = 'NOVO' | 'CONVERSANDO' | 'AGENDOU' | 'CLIENTE' | 'PERDIDO';
export type LeadSource = 'FORMULARIO' | 'DIAGNOSTICO' | 'MANUAL' | 'OUTRO';
export type Role = 'OWNER' | 'MEMBER';

export interface Me {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  businesses: { id: string; name: string; role: Role }[];
}

export interface Business {
  id: string;
  name: string;
  segment: string | null;
  city: string | null;
  whatsapp: string | null;
  captureKey: string;
  allowedOrigins: string[];
  createdAt: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  segment: string | null;
  city: string | null;
  createdAt: string;
  leads: number;
  members: number;
  novos: number;
}

export interface LeadListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interest: string | null;
  status: LeadStatus;
  source: LeadSource;
  followUpAt: string | null;
  lastContactAt: string;
  firstResponseAt: string | null;
  createdAt: string;
}

export interface Note {
  id: string;
  kind: 'NOTA' | 'STATUS' | 'SISTEMA';
  body: string;
  createdAt: string;
  author: { id: string; name: string } | null;
}

export interface Lead extends LeadListItem {
  message: string | null;
  page: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  notes: Note[];
}

export interface Overview {
  periodoDias: number;
  leadsNoPeriodo: number;
  clientesNoPeriodo: number;
  cliquesWhatsapp: number;
  cliquesPorLocal: { location: string; count: number }[];
  porStatus: Record<LeadStatus, number>;
  semResposta: number;
  retornos: number;
  reativar: number;
  serie: { date: string; leads: number }[];
  atencao: Pick<LeadListItem, 'id' | 'name' | 'phone' | 'status' | 'createdAt' | 'followUpAt' | 'firstResponseAt' | 'interest'>[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  since: string;
}
