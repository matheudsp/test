import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';
import { DataSyncController } from './data-sync.controller';
import { CsvFileProcessor } from './processors/csv-file.processor';
import { LocalizationRepository } from './repositories/localization.repository';
import { ProductRepository } from './repositories/product.repository';
import { GasStationRepository } from './repositories/gas-station.repository';
import { PriceHistoryRepository } from './repositories/price-history.repository';
import { AnpRowValidationStrategy } from './validators/anp-row.validator';

@Module({
  imports: [
    TypeOrmModule.forFeature([GasStation, Product, Localization, PriceHistory]),
    HttpModule.register({
      timeout: 120000, // 2 minutes for large file downloads
      maxRedirects: 5,
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024, // 100MB
    }),
  ],
  providers: [
    LocalizationRepository,
    ProductRepository,
    GasStationRepository,
    PriceHistoryRepository,
    CsvFileProcessor,
    AnpRowValidationStrategy,
    
  ],
  controllers: [DataSyncController],
  exports: [
    LocalizationRepository,
    ProductRepository,
    GasStationRepository,
    PriceHistoryRepository,
    CsvFileProcessor,
    AnpRowValidationStrategy,
  ],
})
export class DataSyncModule {}
