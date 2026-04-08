export type AnalyticsSeriesRow = {
  date: string;
  fullDate: string;
  cubeViews: number;
  cubeClicks: number;
  widgetOpens: number;
  addToCart: number;
  sizeChanges: number;
  heightChanges: number;
};

export type AnalyticsResponse = {
  series: AnalyticsSeriesRow[];
  totals: {
    cubeViews: number;
    cubeClicks: number;
    widgetOpens: number;
    addToCart: number;
    sizeChanges: number;
    heightChanges: number;
  };
  rates: {
    clickThroughRate: number | null;
    clickToOpenRate: number | null;
    openToCartRate: number | null;
  };
};
