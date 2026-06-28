export type SalesRow = {
  date: string;
  channel: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  revenue: number;
};

export type SalesDataset = {
  rows: SalesRow[];
  sourceName: string;
  loadedAt: string;
};

export type MonthKey = `${number}-${string}`;
