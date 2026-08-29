/**
 * Synthetic dataset generator — the TypeScript port of reference/customs-data.js,
 * producing wire DTOs (money in integer minor units). Entirely fictional; no real
 * customers, MRNs, EORIs or values, ever — even in tests.
 */
import type { AttentionDto, DeclarationDto, GoodsLineDto } from '../api/dto';

export const TODAY = '2026-08-26';
export const REFRESHED_AT = '2026-08-26 06:15 UTC';
export const CUSTOMER = 'Nordheim Consumer Group';

export interface CountrySeed {
  c: string;
  name: string;
  cur: string;
  vat: number;
  fx: number;
  n: number;
  office: string;
  entity: string;
}

export const COUNTRIES: CountrySeed[] = [
  { c: 'GB', name: 'United Kingdom', cur: 'GBP', vat: 20, fx: 1.17, n: 9, office: 'GB000060 Felixstowe', entity: 'Nordheim UK Ltd' },
  { c: 'DE', name: 'Germany', cur: 'EUR', vat: 19, fx: 1, n: 8, office: 'DE004501 Hamburg', entity: 'Nordheim Europe BV' },
  { c: 'NL', name: 'Netherlands', cur: 'EUR', vat: 21, fx: 1, n: 7, office: 'NL000396 Rotterdam Maasvlakte', entity: 'Nordheim Europe BV' },
  { c: 'SE', name: 'Sweden', cur: 'SEK', vat: 25, fx: 0.088, n: 6, office: 'SE603340 Gothenburg', entity: 'Nordheim Nordics AB' },
  { c: 'BE', name: 'Belgium', cur: 'EUR', vat: 21, fx: 1, n: 5, office: 'BE212000 Antwerp', entity: 'Nordheim Europe BV' },
  { c: 'DK', name: 'Denmark', cur: 'DKK', vat: 25, fx: 0.134, n: 5, office: 'DK004700 Aarhus', entity: 'Nordheim Nordics AB' },
  { c: 'ES', name: 'Spain', cur: 'EUR', vat: 21, fx: 1, n: 4, office: 'ES004611 Valencia', entity: 'Nordheim Europe BV' },
  { c: 'NO', name: 'Norway', cur: 'NOK', vat: 25, fx: 0.086, n: 4, office: 'NO010401 Oslo', entity: 'Nordheim Nordics AB' },
];

// Deterministic PRNG so the dataset is stable across runs and tests.
const makeRnd = () => {
  let s = 88422977;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const GOODS = [
  { code: '8517 62 00', desc: 'Wireless network access points', duty: 0, vpu: 186, wpu: 0.62, sku: 'NW' },
  { code: '8471 30 00', desc: 'Portable computers, under 10 kg', duty: 0, vpu: 412, wpu: 1.4, sku: 'PC' },
  { code: '6109 10 00', desc: 'Cotton T-shirts, knitted', duty: 12, vpu: 4.3, wpu: 0.19, sku: 'AP' },
  { code: '4202 92 91', desc: 'Travel bags, textile outer surface', duty: 9.7, vpu: 16.8, wpu: 0.85, sku: 'BG' },
  { code: '8708 30 10', desc: 'Disc brake assemblies', duty: 3, vpu: 58, wpu: 6.2, sku: 'AU' },
  { code: '9403 20 80', desc: 'Steel storage shelving', duty: 0, vpu: 74, wpu: 18.5, sku: 'FN' },
  { code: '3304 99 00', desc: 'Skin-care preparations', duty: 0, vpu: 6.9, wpu: 0.11, sku: 'CS' },
  { code: '8501 31 00', desc: 'DC motors, output not exceeding 750 W', duty: 2.7, vpu: 34, wpu: 2.9, sku: 'MT' },
  { code: '7318 15 95', desc: 'Steel bolts and screws', duty: 3.7, vpu: 0.42, wpu: 0.03, sku: 'FX' },
  { code: '8536 69 90', desc: 'Electrical plugs and sockets', duty: 2.3, vpu: 1.85, wpu: 0.05, sku: 'EL' },
];
const SUPPLIERS: [string, string][] = [
  ['Brightwave Electronics Co', 'CN'], ['Hanoi Garment JSC', 'VN'], ['Anatolia Textile AS', 'TR'],
  ['Pune Precision Components', 'IN'], ['Ohio Machine Works Inc', 'US'], ['Busan Motor Systems', 'KR'],
  ['Nagoya Fastener KK', 'JP'],
];
const BUYERS: [string, string][] = [
  ['Brightline Retail LLC', 'US'], ['Gulf Distribution FZE', 'AE'], ['Helvetia Trading AG', 'CH'],
  ['Osaka Denki Trading', 'JP'], ['Southern Cross Imports', 'AU'],
];
export const BROKERS = ['ClearPort Customs BV', 'Nordic Customs Partners AB', 'Beacon Trade Services Ltd'];
const EORI: Record<string, string> = {
  'Nordheim UK Ltd': 'GB984627381000',
  'Nordheim Nordics AB': 'SE502077881100',
  'Nordheim Europe BV': 'NL857392046',
};
const BEORI: Record<string, string> = {
  'ClearPort Customs BV': 'NL861002331',
  'Nordic Customs Partners AB': 'SE559201448800',
  'Beacon Trade Services Ltd': 'GB112884067000',
};
const CONT = ['TLLU', 'CSQU', 'HLXU', 'GESU'];
const MODES = ['Maritime', 'Maritime', 'Maritime', 'Maritime', 'Road', 'Air'];
const INCO = ['FOB', 'CIF', 'DAP', 'EXW'];
const CH = 'ABCDEFGHJKLMNPQRSTVWXYZ0123456789';

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function generateDeclarations(): DeclarationDto[] {
  const rnd = makeRnd();
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const pk = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;
  const pad = (n: number) => String(n).padStart(2, '0');
  const mkMrn = (c: string) =>
    '26' + c + Array.from({ length: 14 }, () => CH[Math.floor(rnd() * CH.length)]).join('');
  const toMinor = (units: number) => Math.round(units) * 100;

  function mkLine(no: number, type: DeclarationDto['type'], C: CountrySeed, origin: string): GoodsLineDto {
    const g = pk(GOODS);
    const qty = Math.max(12, Math.round((6000 + rnd() * 110000) / g.vpu));
    const unit = (g.vpu * (0.9 + rnd() * 0.2)) / C.fx;
    const item = Math.round(qty * unit);
    const transport = Math.round(item * 0.031);
    const ins = Math.round(item * 0.004);
    const customs = item + transport + ins;
    const dutyAmt = type === 'import' ? Math.round((customs * g.duty) / 100) : 0;
    const vatRate = type === 'import' ? C.vat : null;
    const vatAmt = type === 'import' ? Math.round(((customs + dutyAmt) * C.vat) / 100) : 0;
    const net = Math.round(qty * g.wpu * 10) / 10;
    const isCounted = g.code.slice(0, 2) === '85' || g.code.slice(0, 2) === '84';
    return {
      no,
      code: g.code,
      desc: g.desc,
      origin,
      proc:
        type === 'import'
          ? '40 00 — Release for free circulation'
          : type === 'export'
            ? '10 00 — Permanent export'
            : 'T1 — External transit',
      pref:
        type === 'import'
          ? rnd() < 0.25
            ? '300 — Tariff preference claimed'
            : '100 — No preference'
          : '§na',
      grossKg: Math.round(net * 1.08 * 10) / 10,
      netKg: net,
      sku: `${g.sku}-${ri(1000, 9999)}`,
      qty,
      itemMinor: toMinor(item),
      customsMinor: toMinor(customs),
      transportMinor: toMinor(transport),
      insuranceMinor: toMinor(ins),
      dutyRatePct: type === 'import' ? g.duty : null,
      dutyMinor: toMinor(dutyAmt),
      vatRatePct: vatRate,
      vatMinor: toMinor(vatAmt),
      packaging: 'CT — Cartons',
      pkgQty: Math.max(1, Math.round(qty / ri(18, 60))),
      suppUnits: isCounted ? `${qty.toLocaleString('en-GB')} items` : '§na',
      quota: '§na',
      exciseMinor: '§na',
      addRef: `INV-26-${ri(1000, 9999)}`,
    };
  }

  function retotal(d: DeclarationDto): void {
    d.invoiceMinor = d.lines.reduce((s, l) => s + l.itemMinor, 0);
    d.transportMinor = d.lines.reduce((s, l) => s + l.transportMinor, 0);
    d.insuranceMinor = d.lines.reduce((s, l) => s + l.insuranceMinor, 0);
    d.customsValueMinor = d.lines.reduce((s, l) => s + l.customsMinor, 0);
    d.dutyMinor = d.lines.reduce((s, l) => s + l.dutyMinor, 0);
    d.vatMinor = d.lines.reduce((s, l) => s + l.vatMinor, 0);
    const first = d.lines[0]!;
    d.commSummary = first.desc + (d.lines.length > 1 ? ` +${d.lines.length - 1} more` : '');
  }

  let idc = 1;
  function mkDecl(C: CountrySeed, type: DeclarationDto['type']): DeclarationDto {
    const nL = pk([1, 1, 2, 2, 2, 3, 3, 4, 6]);
    const date = addDays('2026-03-01', ri(0, 176));
    const sup = pk(SUPPLIERS);
    const buy = pk(BUYERS);
    let origin: string, dest: string, impName: string, expName: string;
    if (type === 'import') {
      origin = sup[1]; dest = C.c; impName = C.entity; expName = sup[0];
    } else if (type === 'export') {
      origin = C.c; dest = buy[1]; impName = buy[0]; expName = C.entity;
    } else {
      origin = pk(['CN', 'US']);
      dest = pk(COUNTRIES.filter((x) => x.c !== C.c)).c;
      impName = C.entity; expName = sup[0];
    }
    const lines = Array.from({ length: nL }, (_, i) =>
      mkLine(i + 1, type, C, type === 'export' ? C.c : origin),
    );
    const status =
      type === 'import'
        ? pk(['Released', 'Released', 'Released', 'Released', 'Released', 'Amended', 'Under customs control'])
        : type === 'export'
          ? pk(['Released', 'Released', 'Released', 'Awaiting release'])
          : pk(['In transit', 'Completed', 'Completed']);
    const released = ['Released', 'Completed', 'Amended'].includes(status);
    const mode = pk(MODES);
    const broker = pk(BROKERS);
    const id = idc++;
    const d: DeclarationDto = {
      mrn: mkMrn(C.c),
      declNo: `${C.c}-${type === 'import' ? 'IMP' : type === 'export' ? 'EXP' : 'TRA'}-26-${ri(10000, 99999)}`,
      ref: `PO-26-${ri(1000, 9999)}`,
      ucr: `6${C.c}${ri(100000000, 999999999)}-${ri(100, 999)}`,
      cc: C.c,
      entity: C.entity,
      type,
      status,
      cur: C.cur,
      fx: C.fx,
      date,
      release: released ? addDays(date, ri(0, 2)) : null,
      origin,
      dest,
      mode,
      incoterms: pk(INCO),
      container: mode === 'Maritime' ? `${pk(CONT)}${ri(1000000, 9999999)}` : '§na',
      office: C.office,
      importer: { name: impName, eori: type === 'export' ? null : EORI[C.entity]! },
      exporter: { name: expName, eori: type === 'export' ? EORI[C.entity]! : null },
      broker,
      brokerEori: BEORI[broker]!,
      invoiceMinor: 0, transportMinor: 0, insuranceMinor: 0,
      customsValueMinor: 0, dutyMinor: 0, vatMinor: 0,
      commSummary: '',
      lines,
      assure: {
        included: true,
        received: `${addDays(date, -1)} ${ri(13, 21)}:${pad(ri(10, 59))} UTC`,
        processed: `${date} 0${ri(2, 8)}:${pad(ri(10, 59))} UTC`,
        updated: REFRESHED_AT,
        completion: pk([100, 100, 100, 99.2, 98.6]),
        verification: 'Verified',
        missing: [],
      },
      attention: null,
    };
    retotal(d);
    // Documents-only extra references derive from id downstream; keep id in UCR-free field? No — stable via mrn.
    void id;
    return d;
  }

  const decls: DeclarationDto[] = [];
  for (const C of COUNTRIES) {
    const imp = Math.ceil(C.n * 0.55);
    const exp = Math.ceil(C.n * 0.25);
    for (let i = 0; i < C.n; i++) {
      decls.push(mkDecl(C, i < imp ? 'import' : i < imp + exp ? 'export' : 'transit'));
    }
  }
  decls.sort((a, b) => b.date.localeCompare(a.date));

  // ---- Curated records requiring attention (deterministic overrides) ----
  const attn = (issue: string, detail: string, tab: AttentionDto['tab'], detected: string, line?: number): AttentionDto =>
    ({ issue, detail, tab, detected, line });

  const GBC = COUNTRIES[0]!;
  const a1 = decls.find((d) => d.cc === 'GB' && d.type === 'import')!;
  if (a1.lines.length < 2) {
    a1.lines.push(mkLine(2, 'import', GBC, a1.origin));
    retotal(a1);
  }
  a1.lines[1]!.netKg = '§np';
  a1.attention = attn('Missing required information', 'Net mass is not populated on goods line 2', 'goods', '2026-08-24', 2);
  a1.assure.completion = 92.9;
  a1.assure.missing = [{
    field: 'Net mass — goods line 2',
    impact: 'Does not prevent use of this declaration. Weight-based analyses will exclude line 2 until the value is provided.',
  }];

  const a2 = decls.find((d) => d.cc === 'DE' && d.type === 'import' && !d.attention)!;
  a2.status = 'Awaiting release';
  a2.release = null;
  a2.date = '2026-08-20';
  a2.attention = attn('Awaiting release', 'Submitted on 20 Aug 2026 and not yet released after 6 days', 'overview', '2026-08-22');

  const a3 = decls.find((d) => d.cc === 'SE' && d.type === 'import' && !d.attention)!;
  a3.attention = attn('Data not refreshed within expected window', 'Last successful update 23 Aug 2026 — updates are expected daily', 'assurance', '2026-08-25');
  a3.assure.updated = '2026-08-23 06:15 UTC';

  const nls = decls.filter((d) => d.cc === 'NL' && d.type === 'import' && !d.attention);
  const a4 = nls[0]!;
  const a5 = nls[1]!;
  a5.ref = a4.ref;
  a4.attention = attn('Potential duplicate customer reference', `Customer reference ${a4.ref} also appears on ${a5.mrn}`, 'references', '2026-08-21');
  a5.attention = attn('Potential duplicate customer reference', `Customer reference ${a5.ref} also appears on ${a4.mrn}`, 'references', '2026-08-21');

  const a6 = decls.find((d) => d.cc === 'BE' && d.type === 'export' && !d.attention)!;
  a6.assure.verification = 'Unverified';
  a6.assure.missing = [{
    field: 'Statistical value — verification pending',
    impact: 'Values can be used, but have not yet been compared with the agreed source record.',
  }];
  a6.attention = attn('Awaiting verification', 'Declaration values not yet compared with the agreed source record', 'assurance', '2026-08-24');

  return decls;
}
