import { Product } from "@/database/entity/product.entity";
import type { AnpCsvRow } from "../interfaces/processor.interface";

export class ProductFactory implements EntityFactory<Product> {
  create(row: AnpCsvRow): Product {
    const product = new Product();
    product.nome = Product.normalizeName(row.PRODUTO);
    product.categoria = Product.determineCategory(row.PRODUTO);
    product.unidade_medida = row['UNIDADE DE MEDIDA']?.trim() || Product.determineUnit(row.PRODUTO);
    product.ativo = true;
    return product;
  }
}