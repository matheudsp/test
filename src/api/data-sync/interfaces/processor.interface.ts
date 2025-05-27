export interface AnpCsvRow {
  CNPJ: string;
  RAZAO: string;
  FANTASIA: string;
  ENDERECO: string;
  NUMERO: string;
  COMPLEMENTO: string;
  BAIRRO: string;
  CEP: string;
  MUNICIPIO: string;
  ESTADO: string;
  BANDEIRA: string;
  PRODUTO: string;
  'UNIDADE DE MEDIDA': string;
  'PREÇO DE REVENDA': string;
  'DATA DA COLETA': string;
}

export interface ProcessingResult {
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  duplicatedRows: number;
  errors: string[];
  gasStations: ProcessingStats;
  products: ProcessingStats;
  localizations: ProcessingStats;
  priceHistories: ProcessingStats;
}

export interface ProcessingStats {
  created: number;
  updated: number;
  skipped: number;
}

// Implementação do padrão Strategy para validação
interface ValidationStrategy {
  validate(data: any): string[];
}