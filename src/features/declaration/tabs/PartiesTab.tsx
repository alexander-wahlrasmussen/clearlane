import type { Declaration } from '../../../domain/declaration';
import { isValue } from '../../../domain/field-value';
import { countryLabel } from '../../../domain/countries';
import { FieldCell, Term } from '../../../components/FieldDisplay';
import { Card, KVGrid } from '../KV';
import styles from '../declaration.module.css';

function eoriCell(f: Declaration['importer']['eori']) {
  return isValue(f) ? <span className="mono">{f.value}</span> : 'Not applicable — non-EU party';
}

export function PartiesTab({ d }: { d: Declaration }) {
  return (
    <div className={styles.twoCol}>
      <Card title="Trade parties">
        <KVGrid
          rows={[
            ['Importer / buyer', d.importer.name],
            [
              <Term help="Economic Operators Registration and Identification number — the trader ID used by customs.">
                Importer EORI
              </Term>,
              eoriCell(d.importer.eori),
            ],
            ['Exporter / seller', d.exporter.name],
            ['Exporter EORI', eoriCell(d.exporter.eori)],
            ['Declarant', `${d.broker.name} (declarant)`],
            ['Declarant EORI', <span className="mono">{d.broker.eori}</span>],
            ['Customs broker', d.broker.name],
          ]}
        />
      </Card>
      <Card title="Movement">
        <KVGrid
          rows={[
            ['Origin country', countryLabel(d.originCountry)],
            ['Exporting country', countryLabel(d.originCountry)],
            ['Destination country', countryLabel(d.destinationCountry)],
            ['Declaration country', d.countryName],
            ['Border transport mode', d.transportMode],
            ['Presentation office', d.presentationOffice],
            ['Containerised', isValue(d.containerNumber) ? 'Yes — containerised' : 'No'],
            [
              'Transport equipment',
              <FieldCell field={d.containerNumber} render={(v) => <span className="mono">{v}</span>} />,
            ],
          ]}
        />
      </Card>
    </div>
  );
}
