import {
  fv,
  NOT_APPLICABLE,
  NOT_AVAILABLE,
  NOT_POPULATED,
  NOT_VERIFIED,
  type FieldValue,
} from '../domain/field-value';
import { money, type Money } from '../domain/money';
import { countryName } from '../domain/countries';
import type {
  Declaration,
  DeclarationStatus,
  GoodsLine,
  Party,
} from '../domain/declaration';
import { DECLARATION_STATUSES } from '../domain/declaration';
import type { DeclarationDto, GoodsLineDto, PartyDto, Sentinel, WireField } from './dto';

const SENTINELS: Record<Sentinel, FieldValue<never>> = {
  '§na': NOT_APPLICABLE,
  '§np': NOT_POPULATED,
  '§nav': NOT_AVAILABLE,
  '§unv': NOT_VERIFIED,
};

export function parseWireField<T>(v: WireField<T>): FieldValue<T> {
  if (typeof v === 'string' && v in SENTINELS) return SENTINELS[v as Sentinel];
  return fv(v as T);
}

function parseParty(p: PartyDto): Party {
  return { name: p.name, eori: p.eori === null ? NOT_APPLICABLE : fv(p.eori) };
}

function parseStatus(s: string): DeclarationStatus {
  const known = DECLARATION_STATUSES.find((k) => k === s);
  if (!known) throw new Error(`Unknown declaration status on the wire: "${s}"`);
  return known;
}

export function mapLine(l: GoodsLineDto, currency: string): GoodsLine {
  const m = (minor: number): Money => money(minor, currency);
  return {
    lineNo: l.no,
    commodityCode: l.code,
    description: l.desc,
    originCountry: l.origin,
    procedure: l.proc,
    preference: parseWireField(l.pref),
    grossKg: parseWireField(l.grossKg),
    netKg: parseWireField(l.netKg),
    quantity: l.qty,
    sku: parseWireField(l.sku),
    packagingType: parseWireField(l.packaging),
    packageQuantity: parseWireField(l.pkgQty),
    supplementaryUnits: parseWireField(l.suppUnits),
    quotaReference: parseWireField(l.quota),
    additionalReference: parseWireField(l.addRef),
    itemValue: m(l.itemMinor),
    customsValue: m(l.customsMinor),
    transportCosts: m(l.transportMinor),
    insuranceCosts: m(l.insuranceMinor),
    dutyRatePct: l.dutyRatePct === null ? NOT_APPLICABLE : fv(l.dutyRatePct),
    dutyAmount: m(l.dutyMinor),
    vatRatePct: l.vatRatePct === null ? NOT_APPLICABLE : fv(l.vatRatePct),
    vatAmount: m(l.vatMinor),
    excise:
      typeof l.exciseMinor === 'string'
        ? parseWireField<Money>(l.exciseMinor as Sentinel)
        : fv(money(l.exciseMinor, currency)),
  };
}

export function mapDeclaration(d: DeclarationDto): Declaration {
  const m = (minor: number): Money => money(minor, d.cur);
  return {
    mrn: d.mrn,
    declarationNumber: d.declNo,
    customerReference: d.ref,
    ucr: d.ucr,
    countryCode: d.cc,
    countryName: countryName(d.cc),
    legalEntity: d.entity,
    type: d.type,
    status: parseStatus(d.status),
    currency: d.cur,
    declaredFxToEur: d.fx,
    clearanceDate: d.date,
    releaseDate: d.release,
    departureCountry: d.departure,
    destinationCountry: d.dest,
    transportMode: d.mode,
    incoterms: d.incoterms,
    containerNumber: parseWireField(d.container),
    presentationOffice: parseWireField(d.office),
    importer: parseParty(d.importer),
    exporter: parseParty(d.exporter),
    declarant: parseParty(d.declarant),
    broker: { name: d.broker, eori: d.brokerEori },
    invoiceTotal: m(d.invoiceMinor),
    transportTotal: m(d.transportMinor),
    insuranceTotal: m(d.insuranceMinor),
    customsValueTotal: m(d.customsValueMinor),
    dutyTotal: m(d.dutyMinor),
    vatTotal: m(d.vatMinor),
    commoditySummary: d.commSummary,
    lines: d.lines.map((l) => mapLine(l, d.cur)),
    assurance: {
      includedInInsights: d.assure.included,
      receivedAt: d.assure.received,
      processedAt: d.assure.processed,
      lastUpdatedAt: d.assure.updated,
      completionPct: d.assure.completion,
      verification: d.assure.verification,
      missing: d.assure.missing,
    },
    attention: d.attention
      ? {
          issue: d.attention.issue,
          detail: d.attention.detail,
          tab: d.attention.tab,
          detectedOn: d.attention.detected,
          lineNo: d.attention.line,
        }
      : null,
  };
}
