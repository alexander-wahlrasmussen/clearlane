/** Human names for every country code the dataset can contain. */
export const COUNTRY_NAMES: Record<string, string> = {
  GB: 'United Kingdom', DE: 'Germany', NL: 'Netherlands', SE: 'Sweden',
  BE: 'Belgium', DK: 'Denmark', ES: 'Spain', NO: 'Norway',
  CN: 'China', US: 'United States', VN: 'Vietnam', TR: 'Türkiye',
  IN: 'India', KR: 'South Korea', JP: 'Japan', AE: 'United Arab Emirates',
  CH: 'Switzerland', AU: 'Australia',
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}

/** "Germany (DE)" — name first, code as qualifier. Principle #7. */
export function countryLabel(code: string): string {
  return `${countryName(code)} (${code})`;
}
