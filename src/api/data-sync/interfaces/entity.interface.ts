interface EntityFactory<T> {
  create(data: any): T;
}

interface EntityRepository<T> {
  findByKey(key: string): Promise<T | null>;
  upsert(entity: T): Promise<T>;
  bulkUpsert(entities: T[]): Promise<T[]>;
}