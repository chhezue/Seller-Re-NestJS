export enum PRODUCT_STATUS {
  ON_SALE = 'ON_SALE', // 판매 중
  RESERVED = 'RESERVED', // 예약 중
  SOLD = 'SOLD', // 판매 완료
}

export enum TRADE_TYPE {
  SELL = 'SELL', // 판매
  SHARE = 'SHARE', // 나눔
}

export enum PRODUCT_CONDITION {
  NEW = 'NEW', // 새 상품
  LIKE_NEW = 'LIKE_NEW', // 사용감 적음
  USED = 'USED', // 사용감 보통
  FOR_PARTS = 'FOR_PARTS', // 사용감 많음
}
