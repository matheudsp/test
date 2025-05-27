import { PriceHistory } from "@/database/entity/price-history.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

@Injectable()
export class PriceHistoryRepository implements EntityRepository<PriceHistory> {
  constructor(
    @InjectRepository(PriceHistory)
    private readonly repository: Repository<PriceHistory>,
  ) {}

  async findByKey(key: string): Promise<PriceHistory | null> {
    return this.repository.findOne({ where: { id: key } });
  }

  async findByUpsertKey(upsertKey: string): Promise<PriceHistory | null> {
    const [postoId, produtoId, dataStr] = upsertKey.split('|');
    const data = new Date(dataStr);
    
    return this.repository.findOne({
      where: {
        posto_id: postoId,
        produto_id: produtoId,
        data_coleta: data
      }
    });
  }

  async upsert(entity: PriceHistory): Promise<PriceHistory> {
    const existing = await this.findByUpsertKey(entity.getUpsertKey());
    
    if (existing) {
      // Atualizar preço se for diferente
      if (existing.preco_venda !== entity.preco_venda) {
        existing.preco_venda = entity.preco_venda;
        return this.repository.save(existing);
      }
      return existing;
    }

    return this.repository.save(entity);
  }

  async bulkUpsert(entities: PriceHistory[]): Promise<PriceHistory[]> {
    const results: PriceHistory[] = [];
    
    // Processar em lotes para melhor performance
    const batchSize = 100;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      
      for (const entity of batch) {
        results.push(await this.upsert(entity));
      }
    }
    
    return results;
  }

  async checkDuplicates(entities: PriceHistory[]): Promise<Set<string>> {
    const duplicateKeys = new Set<string>();
    const upsertKeys = entities.map(e => e.getUpsertKey());
    
    if (upsertKeys.length === 0) return duplicateKeys;
    
    const existingRecords = await this.repository
      .createQueryBuilder('ph')
      .select(['ph.posto_id', 'ph.produto_id', 'ph.data_coleta'])
      .where('CONCAT(ph.posto_id, \'|\', ph.produto_id, \'|\', DATE(ph.data_coleta)) IN (:...keys)', {
        keys: upsertKeys
      })
      .getMany();
    
    existingRecords.forEach(record => {
      const key = PriceHistory.createUpsertKey(
        record.posto_id,
        record.produto_id,
        record.data_coleta
      );
      duplicateKeys.add(key);
    });
    
    return duplicateKeys;
  }
}