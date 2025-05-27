import { Localization } from '@/database/entity/localization.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

@Injectable()
export class LocalizationRepository implements EntityRepository<Localization> {
  constructor(
    @InjectRepository(Localization)
    private readonly repository: Repository<Localization>,
  ) {}

  async findByKey(key: string): Promise<Localization | null> {
    return this.repository.findOne({ where: { id: key } });
  }

  async findByLocationKey(locationKey: string): Promise<Localization | null> {
    const [uf, municipio] = locationKey.split('|');
    return this.repository.findOne({
      where: { uf, municipio }
    });
  }

  async upsert(entity: Localization): Promise<Localization> {
    const existing = await this.findByLocationKey(entity.getLocationKey());
    
    if (existing && existing.isSimilarTo(entity)) {
      return existing;
    }

    return this.repository.save(entity);
  }

  async bulkUpsert(entities: Localization[]): Promise<Localization[]> {
    const results: Localization[] = [];
    
    for (const entity of entities) {
      results.push(await this.upsert(entity));
    }
    
    return results;
  }
}