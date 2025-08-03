import {
  PRODUCT_CONDITION,
  PRODUCT_STATUS,
  TRADE_TYPE,
} from '../const/product.const';

export const PRODUCT_STATUS_LABELS: Record<PRODUCT_STATUS, string> = {
  [PRODUCT_STATUS.ON_SALE]: '판매 중',
  [PRODUCT_STATUS.RESERVED]: '예약 중',
  [PRODUCT_STATUS.SOLD]: '판매 완료',
};

export const TRADE_TYPE_LABELS: Record<TRADE_TYPE, string> = {
  [TRADE_TYPE.SELL]: '판매',
  [TRADE_TYPE.SHARE]: '나눔',
};

export const PRODUCT_CONDITION_LABELS: Record<PRODUCT_CONDITION, string> = {
  [PRODUCT_CONDITION.NEW]: '새 상품',
  [PRODUCT_CONDITION.LIKE_NEW]: '사용감 적음',
  [PRODUCT_CONDITION.USED]: '사용감 보통',
  [PRODUCT_CONDITION.FOR_PARTS]: '사용감 많음',
};

export function enumTransform<T extends string>(
  enumObject: Record<string, T>,
  labelMap: Record<T, string>,
): { key: T; label: string }[] {
  return Object.values(enumObject).map((key) => ({
    key,
    label: labelMap[key],
  }));
}
