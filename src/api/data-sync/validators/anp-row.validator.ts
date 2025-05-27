import { GasStation } from '@/database/entity/gas-station.entity';
import type { AnpCsvRow } from '../interfaces/processor.interface';
import type { ValidationStrategy } from '../interfaces/validator.interface';

export class AnpRowValidationStrategy implements ValidationStrategy {
  validate(row: AnpCsvRow): string[] {
    const errors: string[] = [];

    if (!row.CNPJ?.trim()) {
      errors.push('CNPJ é obrigatório');
    } else if (!GasStation.validateCnpj(row.CNPJ)) {
      errors.push('CNPJ inválido');
    }

    if (!row.RAZAO?.trim()) {
      errors.push('Razão social é obrigatória');
    }

    if (!row.MUNICIPIO?.trim()) {
      errors.push('Município é obrigatório');
    }

    if (!row.ESTADO?.trim()) {
      errors.push('Estado é obrigatório');
    }

    if (!row.PRODUTO?.trim()) {
      errors.push('Produto é obrigatório');
    }

    if (!row['PREÇO DE REVENDA']) {
      errors.push('Preço de revenda é obrigatório');
    } else {
      const price = this.parsePrice(row['PREÇO DE REVENDA']);
      if (isNaN(price) || price <= 0) {
        errors.push('Preço de revenda inválido');
      }
    }

    if (!row['DATA DA COLETA']) {
      errors.push('Data da coleta é obrigatória');
    } else {
      const date = this.parseDate(row['DATA DA COLETA']);
      if (!date || isNaN(date.getTime())) {
        errors.push('Data da coleta inválida');
      }
    }

    return errors;
  }

  private parsePrice(priceStr: string): number {
    return parseFloat(priceStr.replace(',', '.'));
  }

  private parseDate(dateStr: string): Date {
    const [month, day, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
}
