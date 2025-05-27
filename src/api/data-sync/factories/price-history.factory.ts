import type { GasStation } from "@/database/entity/gas-station.entity";
import { PriceHistory } from "@/database/entity/price-history.entity";
import type { AnpCsvRow } from "../interfaces/processor.interface";
import type { Product } from "@/database/entity/product.entity";

export class PriceHistoryFactory implements EntityFactory<PriceHistory> {
  create(data: { row: AnpCsvRow; gasStation: GasStation; product: Product }): PriceHistory {
    const priceHistory = new PriceHistory();
    priceHistory.data_coleta = this.parseDate(data.row['DATA DA COLETA']);
    priceHistory.preco_venda = this.parsePrice(data.row['PREÇO DE REVENDA']);
    priceHistory.posto_id = data.gasStation.id;
    priceHistory.produto_id = data.product.id;
    priceHistory.ativo = true;
    return priceHistory;
  }

  private parsePrice(priceStr: string): number {
    return parseFloat(priceStr.replace(',', '.'));
  }

  private parseDate(dateStr: string): Date {
    const [month, day, year] = dateStr.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
}