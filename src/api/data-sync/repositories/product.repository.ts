import { Product } from '@/database/entity/product.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

@Injectable()
export class ProductRepository implements EntityRepository<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly repository: Repository<Product>,
  ) {}

  async findByKey(nome: string): Promise<Product | null> {
    return this.repository.findOne({ where: { nome } });
  }

  async upsert(entity: Product): Promise<Product> {
    const existing = await this.findByKey(entity.nome);
    
    if (existing) {
      return existing;
    }

    return this.repository.save(entity);
  }

  async bulkUpsert(entities: Product[]): Promise<Product[]> {
    const results: Product[] = [];
    const uniqueProducts = new Map<string, Product>();
    
    // Remove duplicatas locais
    entities.forEach(product => {
      uniqueProducts.set(product.nome, product);
    });
    
    for (const entity of uniqueProducts.values()) {
      results.push(await this.upsert(entity));
    }
    
    return results;
  }
}