import { Localization } from "@/database/entity/localization.entity";
import type { AnpCsvRow } from "../interfaces/processor.interface";

export class LocalizationFactory implements EntityFactory<Localization> {
  create(row: AnpCsvRow): Localization {
    const localization = new Localization();
    localization.uf = Localization.normalizeUf(row.ESTADO);
    localization.municipio = Localization.normalizeMunicipio(row.MUNICIPIO);
    localization.endereco = row.ENDERECO?.trim() || null;
    localization.numero = row.NUMERO?.trim() || null;
    localization.complemento = row.COMPLEMENTO?.trim() || null;
    localization.bairro = row.BAIRRO?.trim() || null;
    localization.cep = this.normalizeCep(row.CEP);
    return localization;
  }

  private normalizeCep(cep: string): string | null {
    if (!cep) return null;
    const cleaned = cep.replace(/[^\d]/g, '');
    return cleaned.length === 8 ? `${cleaned.substr(0, 5)}-${cleaned.substr(5)}` : null;
  }
}





