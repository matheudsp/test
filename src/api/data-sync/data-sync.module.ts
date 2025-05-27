import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GasStation } from '@/database/entity/gas-station.entity';
import { Localization } from '@/database/entity/localization.entity';
import { Product } from '@/database/entity/product.entity';
import { PriceHistory } from '@/database/entity/price-history.entity';

// Controllers
import { DataSyncController } from './data-sync.controller';

// Legacy services (for backward compatibility)


// File processing services


// SOLID components for CSV processing


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
   
  ],
  controllers: [DataSyncController],
  exports: [
   
  ],
})
export class DataSyncModule {}