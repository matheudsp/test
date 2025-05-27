import { GasStation } from '@/database/entity/gas-station.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

@Injectable()
export class GasStationRepository implements EntityRepository<GasStation> {
  constructor(
    @InjectRepository(GasStation)
    private readonly repository: Repository<GasStation>,
  ) {}

  async findByKey(cnpj: string): Promise<GasStation | null> {
    const normalizedCnpj = cnpj.replace(/[^\d]/g, '');
    return this.repository.findOne({
      where: { cnpj: normalizedCnpj },
      relations: ['localizacao']
    });
  }

  async findByCnpj(cnpj: string): Promise<GasStation | null> {
    return this.repository.findOne({
      where: { cnpj },
      relations: ['localizacao']
    });
  }

  async upsert(entity: GasStation): Promise<GasStation> {
    const existing = await this.findByCnpj(entity.cnpj);
    
    if (existing) {
      // Atualizar dados se necessário
      existing.nome = entity.nome;
      existing.nome_fantasia = entity.nome_fantasia;
      existing.bandeira = entity.bandeira;
      existing.localizacao_id = entity.localizacao_id;
      return this.repository.save(existing);
    }

    return this.repository.save(entity);
  }

  async bulkUpsert(entities: GasStation[]): Promise<GasStation[]> {
    const results: GasStation[] = [];
    
    for (const entity of entities) {
      results.push(await this.upsert(entity));
    }
    
    return results;
  }
}