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
      'Processes local CSV file with ANP fuel price data. Only inserts/updates records if the collection date is newer or equal to existing records.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV processed successfully with detailed statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            totalProcessed: {
              type: 'number',
              description: 'Total records processed (inserted + updated)',
            },
            totalInserted: {
              type: 'number',
              description: 'New records inserted',
            },
            totalUpdated: {
              type: 'number',
              description: 'Existing records updated',
            },
            totalSkipped: {
              type: 'number',
              description: 'Records skipped (older data)',
            },
            totalErrors: { type: 'number', description: 'Records with errors' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'number' },
                  data: { type: 'object' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
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