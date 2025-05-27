export interface ValidationStrategy {
  validate(data: any): string[];
}