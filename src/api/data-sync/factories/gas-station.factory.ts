import { GasStation } from "@/database/entity/gas-station.entity";
import type { AnpCsvRow } from "../interfaces/processor.interface";

export class GasStationFactory implements EntityFactory<GasStation> {
  create(row: AnpCsvRow): GasStation {
    const gasStation = new GasStation();
    gasStation.nome = GasStation.normalizeName(row.RAZAO);
    gasStation.nome_fantasia = row.FANTASIA?.trim() || null;
    gasStation.bandeira = row.BANDEIRA?.trim() || null;
    gasStation.cnpj = this.normalizeCnpj(row.CNPJ);
    gasStation.ativo = true;
    return gasStation;
  }

  private normalizeCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length === 14) {
      return `${cleaned.substr(0, 2)}.${cleaned.substr(2, 3)}.${cleaned.substr(5, 3)}/${cleaned.substr(8, 4)}-${cleaned.substr(12)}`;
    }
    return cleaned;
  }
}