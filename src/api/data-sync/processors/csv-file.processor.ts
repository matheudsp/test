import { Injectable, Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { LocalizationRepository } from '../repositories/localization.repository';
import type { ProductRepository } from '../repositories/product.repository';
import type { GasStationRepository } from '../repositories/gas-station.repository';
import type { PriceHistoryRepository } from '../repositories/price-history.repository';
import type { Product } from '@/database/entity/product.entity';
import type { GasStation } from '@/database/entity/gas-station.entity';
import type { Localization } from '@/database/entity/localization.entity';
import type { ValidationStrategy } from '../interfaces/validator.interface';
import type { PriceHistory } from '@/database/entity/price-history.entity';
import type {
  AnpCsvRow,
  ProcessingResult,
} from '../interfaces/processor.interface';

import { LocalizationFactory } from '../factories/localization.factory';
import { ProductFactory } from '../factories/product.factory';
import { GasStationFactory } from '../factories/gas-station.factory';
import { PriceHistoryFactory } from '../factories/price-history.factory';
import Papa from 'papaparse';
import { AnpRowValidationStrategy } from '../validators/anp-row.validator';
import * as path from 'path';
import * as fs from 'node:fs/promises';

@Injectable()
export class CsvFileProcessor {
  private readonly logger = new Logger(CsvFileProcessor.name);
  private readonly validator: ValidationStrategy;
  private readonly localizationFactory: EntityFactory<Localization>;
  private readonly productFactory: EntityFactory<Product>;
  private readonly gasStationFactory: EntityFactory<GasStation>;
  private readonly priceHistoryFactory: EntityFactory<PriceHistory>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly localizationRepository: LocalizationRepository,
    private readonly productRepository: ProductRepository,
    private readonly gasStationRepository: GasStationRepository,
    private readonly priceHistoryRepository: PriceHistoryRepository,
  ) {
    // Injeção de dependências via constructor - seguindo princípios SOLID
    this.validator = new AnpRowValidationStrategy();
    this.localizationFactory = new LocalizationFactory();
    this.productFactory = new ProductFactory();
    this.gasStationFactory = new GasStationFactory();
    this.priceHistoryFactory = new PriceHistoryFactory();
  }

  async processFile(filename: string): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      totalRows: 0,
      processedRows: 0,
      skippedRows: 0,
      duplicatedRows: 0,
      errors: [],
      gasStations: { created: 0, updated: 0, skipped: 0 },
      products: { created: 0, updated: 0, skipped: 0 },
      localizations: { created: 0, updated: 0, skipped: 0 },
      priceHistories: { created: 0, updated: 0, skipped: 0 },
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const csvData = await this.readCsvFile(filename);
      result.totalRows = csvData.length;

      this.logger.log(`Iniciando processamento de ${result.totalRows} linhas`);

      // Filtrar dados válidos
      const validRows = await this.validateAndFilterRows(csvData, result);

      if (validRows.length === 0) {
        this.logger.warn('Nenhuma linha válida encontrada para processar');
        await queryRunner.rollbackTransaction();
        return result;
      }

      // Processar em etapas seguindo a ordem de dependências
      const localizationMap = await this.processLocalizations(
        validRows,
        result,
      );
      const productMap = await this.processProducts(validRows, result);
      const gasStationMap = await this.processGasStations(
        validRows,
        result,
        localizationMap,
      );
      await this.processPriceHistories(
        validRows,
        result,
        gasStationMap,
        productMap,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `Processamento concluído: ${result.processedRows}/${result.totalRows} linhas processadas`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Erro durante processamento do CSV:', error);
      result.errors.push(`Erro crítico: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  private async readCsvFile(filename: string): Promise<AnpCsvRow[]> {
    const filePath = path.join(process.cwd(), 'storage', 'csv', filename);

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const parseResult = Papa.parse<AnpCsvRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,

        transformHeader: (header: string) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        this.logger.warn('Avisos durante parse do CSV:', parseResult.errors);
      }

      // Filtrar linhas que não são dados (cabeçalhos adicionais da ANP)
      return parseResult.data.filter(
        (row) =>
          row.CNPJ &&
          !row.CNPJ.includes('AGÊNCIA NACIONAL') &&
          !row.CNPJ.includes('SUPERINTENDÊNCIA') &&
          row.CNPJ.trim() !== '',
      );
    } catch (error) {
      this.logger.error(`Erro ao ler arquivo ${filename}:`, error);
      throw new Error(`Falha ao processar arquivo CSV: ${error.message}`);
    }
  }

  private async validateAndFilterRows(
    rows: AnpCsvRow[],
    result: ProcessingResult,
  ): Promise<AnpCsvRow[]> {
    const validRows: AnpCsvRow[] = [];

    for (const row of rows) {
      const errors = this.validator.validate(row);

      if (errors.length > 0) {
        result.skippedRows++;
        result.errors.push(
          `Linha ${validRows.length + result.skippedRows}: ${errors.join(', ')}`,
        );
        continue;
      }

      validRows.push(row);
    }

    this.logger.log(
      `${validRows.length} linhas válidas de ${rows.length} total`,
    );
    return validRows;
  }

  private async processLocalizations(
    rows: AnpCsvRow[],
    result: ProcessingResult,
  ): Promise<Map<string, Localization>> {
    const localizationMap = new Map<string, Localization>();
    const uniqueLocalizations = new Map<string, Localization>();

    // Extrair localizações únicas
    rows.forEach((row) => {
      const localization = this.localizationFactory.create(row);
      const key = localization.getLocationKey();

      if (!uniqueLocalizations.has(key)) {
        uniqueLocalizations.set(key, localization);
      }
    });

    this.logger.log(
      `Processando ${uniqueLocalizations.size} localizações únicas`,
    );

    // Processar localizações
    for (const [key, localization] of uniqueLocalizations) {
      try {
        const savedLocalization =
          await this.localizationRepository.upsert(localization);
        localizationMap.set(key, savedLocalization);
        result.localizations.created++;
      } catch (error) {
        this.logger.error(`Erro ao processar localização ${key}:`, error);
        result.errors.push(`Erro na localização ${key}: ${error.message}`);
      }
    }

    return localizationMap;
  }

  private async processProducts(
    rows: AnpCsvRow[],
    result: ProcessingResult,
  ): Promise<Map<string, Product>> {
    const productMap = new Map<string, Product>();
    const uniqueProducts = new Map<string, Product>();

    // Extrair produtos únicos
    rows.forEach((row) => {
      const product = this.productFactory.create(row);
      const key = product.nome;

      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, product);
      }
    });

    this.logger.log(`Processando ${uniqueProducts.size} produtos únicos`);

    // Processar produtos
    for (const [key, product] of uniqueProducts) {
      try {
        const savedProduct = await this.productRepository.upsert(product);
        productMap.set(key, savedProduct);
        result.products.created++;
      } catch (error) {
        this.logger.error(`Erro ao processar produto ${key}:`, error);
        result.errors.push(`Erro no produto ${key}: ${error.message}`);
      }
    }

    return productMap;
  }

  private async processGasStations(
    rows: AnpCsvRow[],
    result: ProcessingResult,
    localizationMap: Map<string, Localization>,
  ): Promise<Map<string, GasStation>> {
    const gasStationMap = new Map<string, GasStation>();
    const uniqueGasStations = new Map<string, GasStation>();

    // Extrair postos únicos
    rows.forEach((row) => {
      const gasStation = this.gasStationFactory.create(row);
      const localization = this.localizationFactory.create(row);
      const locationKey = localization.getLocationKey();

      const savedLocalization = localizationMap.get(locationKey);
      if (savedLocalization) {
        gasStation.localizacao_id = savedLocalization.id;
        const key = gasStation.getUpsertKey(); // CNPJ normalizado

        if (!uniqueGasStations.has(key)) {
          uniqueGasStations.set(key, gasStation);
        }
      }
    });

    this.logger.log(`Processando ${uniqueGasStations.size} postos únicos`);

    // Processar postos
    for (const [key, gasStation] of uniqueGasStations) {
      try {
        const savedGasStation =
          await this.gasStationRepository.upsert(gasStation);
        gasStationMap.set(key, savedGasStation);
        result.gasStations.created++;
      } catch (error) {
        this.logger.error(`Erro ao processar posto ${key}:`, error);
        result.errors.push(`Erro no posto ${key}: ${error.message}`);
      }
    }

    return gasStationMap;
  }

  private async processPriceHistories(
    rows: AnpCsvRow[],
    result: ProcessingResult,
    gasStationMap: Map<string, GasStation>,
    productMap: Map<string, Product>,
  ): Promise<void> {
    const priceHistories: PriceHistory[] = [];

    // Criar históricos de preços
    rows.forEach((row) => {
      const gasStation = this.gasStationFactory.create(row);
      const product = this.productFactory.create(row);

      const savedGasStation = gasStationMap.get(gasStation.getUpsertKey());
      const savedProduct = productMap.get(product.nome);

      if (savedGasStation && savedProduct) {
        const priceHistory = this.priceHistoryFactory.create({
          row,
          gasStation: savedGasStation,
          product: savedProduct,
        });

        priceHistories.push(priceHistory);
      }
    });

    this.logger.log(`Processando ${priceHistories.length} registros de preços`);

    // Verificar duplicatas antes do processamento
    const duplicateKeys =
      await this.priceHistoryRepository.checkDuplicates(priceHistories);
    result.duplicatedRows = duplicateKeys.size;

    // Filtrar registros não duplicados
    const newPriceHistories = priceHistories.filter(
      (ph) => !duplicateKeys.has(ph.getUpsertKey()),
    );

    this.logger.log(
      `${newPriceHistories.length} novos registros de preços (${duplicateKeys.size} duplicatas ignoradas)`,
    );

    // Processar em lotes
    if (newPriceHistories.length > 0) {
      await this.priceHistoryRepository.bulkUpsert(newPriceHistories);
      result.priceHistories.created = newPriceHistories.length;
    }

    result.processedRows = rows.length - result.skippedRows;
  }

  buildProcessingMessage(result: ProcessingResult): string {
    const lines = [
      `✅ Processamento concluído!`,
      `📊 Total de linhas: ${result.totalRows}`,
      `✔️ Processadas: ${result.processedRows}`,
      `⏭️ Ignoradas: ${result.skippedRows}`,
      `🔄 Duplicadas: ${result.duplicatedRows}`,
      ``,
      `📍 Localizações: ${result.localizations.created} criadas`,
      `⛽ Postos: ${result.gasStations.created} criados/atualizados`,
      `🛢️ Produtos: ${result.products.created} criados`,
      `💰 Preços: ${result.priceHistories.created} novos registros`,
    ];

    if (result.errors.length > 0) {
      lines.push(``, `⚠️ Erros encontrados: ${result.errors.length}`);
      lines.push(...result.errors.slice(0, 5)); // Mostrar apenas os primeiros 5 erros

      if (result.errors.length > 5) {
        lines.push(`... e mais ${result.errors.length - 5} erros`);
      }
    }

    return lines.join('\n');
  }
}
