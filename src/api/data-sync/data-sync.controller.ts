import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OpenApiResponses } from '@/common/decorators/openapi.decorator';
import { DownloadSpreadsheetDto } from './dtos/download-spreadsheet.dto';
import { responseOk, responseBadRequest } from '@/common/utils/response-api';

@ApiTags('Sincronizar Dados')
@Controller({ path: 'data-sync', version: '1' })
export class DataSyncController {
  private readonly logger = new Logger(DataSyncController.name);

  constructor(
    private readonly csvProcessor: CsvFileProcessor,
  
  ) {}

  @Post('process-csv')
  @ApiOperation({
    summary: 'Process ANP CSV file',
    description:
      'Processes local CSV file with ANP fuel price data.',
  })
  
  @OpenApiResponses([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR])
  async processCsv() {
    try {
      const fileToProcess = 'anp_mes5_semana4.csv';

      this.logger.log(`Processing file: ${fileToProcess}`);

      const result = await this.csvProcessor.processFile(fileToProcess);

      const message = this.buildProcessingMessage(result);

      return responseOk({
        message,
        data: result,
      });
    } catch (error) {
      this.logger.error('CSV processing failed:', error);
      return responseBadRequest({ error: error.message });
    }
  }

 



}