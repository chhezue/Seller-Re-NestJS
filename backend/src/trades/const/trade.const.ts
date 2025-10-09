export enum TRADE_REQUEST_STATUS {
  PENDING = 'PENDING', // 대기 중
  ACCEPTED = 'ACCEPTED', // 수락됨
  REJECTED = 'REJECTED', // 거절됨
}

// 거래 요청 타입
export enum TRADE_REQUEST_TYPE {
  BUY = 'BUY', // 구매 요청
  OFFER = 'OFFER', // 가격 제안
}

// 거래 방식
export enum TRADE_METHOD {
  DIRECT = 'DIRECT', // 직거래
  DELIVERY = 'DELIVERY', // 택배
}
