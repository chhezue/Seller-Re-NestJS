## 백엔드 폴더 구조

---

```plaintext
src/
├── main.ts                         # 🚀 애플리케이션 시작점
├── app.module.ts                   # 🏠 루트 모듈
│
├── 📁 admin/                       # 🛡️ 관리자 기능 (사용자/상품 관리, 신고 처리)
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   └── admin.service.ts
│
├── 📁 auth/                        # 🔑 인증/인가 (로그인, JWT, 소셜로그인, 가드)
│   ├── dto/
│   ├── guards/
│   ├── strategies/                 # - JwtStrategy, LocalStrategy 등
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
│
├── -------------------------------- (핵심 도메인)
│
├── 📁 users/                       # 👤 사용자 (프로필, 신고, 소셜 계정)
│   ├── dto/
│   ├── entities/                   # - user.base.entity.ts, user_report.base.entity.ts, social_account.base.entity.ts
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
│
├── 📁 products/                    # 🛍️ 상품 (CRUD, 검색, 이미지, 즐겨찾기, 신고)
│   ├── dto/
│   ├── entities/                   # - product.base.entity.ts, product_image.base.entity.ts, user_favorite.base.entity.ts, product_report.base.entity.ts
│   ├── products.module.ts
│   ├── products.controller.ts
│   └── products.service.ts
│
├── 📁 chat/                        # 💬 실시간 채팅
│   ├── dto/
│   ├── entities/                   # - chat_room.base.entity.ts, chat_message.base.entity.ts
│   ├── chat.module.ts
│   ├── chat.gateway.ts             # - WebSocket 로직 담당
│   └── chat.service.ts
│
├── -------------------------------- (보조 도메인 및 기능)
│
├── 📁 categories/                  # 🗂️ 카테고리
│   ├── entities/                   # - category.base.entity.ts
│   ├── categories.module.ts
│   ├── categories.controller.ts
│   └── categories.service.ts
│
├── 📁 regions/                     # 🗺️ 지역 정보
│   ├── entities/                   # - region.base.entity.ts
│   ├── regions.module.ts
│   ├── regions.controller.ts
│   └── regions.service.ts
│
├── 📁 reviews/                     # ⭐ 리뷰 및 평점
│   ├── dto/
│   ├── entities/                   # - review.base.entity.ts
│   ├── reviews.module.ts
│   ├── reviews.controller.ts
│   └── reviews.service.ts
│
├── 📁 transactions/               # 💳 거래 내역
│   ├── entities/                   # - transaction.base.entity.ts
│   ├── transactions.module.ts
│   ├── transactions.controller.ts
│   └── transactions.service.ts
│
├── -------------------------------- (공통 기능 / 인프라)
│
├── 📁 uploads/                     # 🖼️ 파일 업로드 (S3 등 연동)
│   ├── uploads.module.ts
│   └── uploads.service.ts
│
├── 📁 notifications/               # 🔔 알림 (Push, 웹소켓)
│   ├── notifications.module.ts
│   ├── notifications.gateway.ts
│   └── notifications.service.ts
│
├── 📁 common/                      # ♻️ 공통 유틸리티 (Pipes, Filters, Decorators)
│   ├── decorators/
│   ├── dtos/                       # - 페이지네이션 DTO 등
│   ├── enums/
│   └── filters/                    # - HttpExceptionFilter
│
└── 📁 config/                      # ⚙️ 환경설정
    ├── database.config.ts
    ├── jwt.config.ts
    └── index.ts
```

## 프론트엔드 폴더 구조

---
```
src/
├── App.tsx                      # 🏠 전역 프로바이더 및 라우팅 설정
├── main.tsx                     # 🚀 애플리케이션 진입점
│
├── 📁 assets/                   # 🖼️ 정적 자산 (이미지, 폰트)
│
├── 📁 components/               # 💎 재사용 UI 컴포넌트 라이브러리
│   ├── ui/                      #    - 원자적 UI 요소 (Button, Input, Modal)
│   └── shared/                  #    - 여러 기능에 걸쳐 사용되는 복합 컴포넌트 (Header, ProductCard)
│
├── 📁 features/                 # ⭐ 애플리케이션의 핵심 기능 모음 (도메인)
│   │
│   ├── auth/                    #    - 🔑 인증 (로그인, 회원가입)
│   │   ├── components/          #      - LoginForm.tsx, SocialLoginButtons.tsx
│   │   ├── hooks/               #      - useAuth.ts
│   │   └── routes/              #      - LoginPage.tsx, RegisterPage.tsx
│   │
│   ├── products/                #    - 🛍️ 상품 (목록, 상세, 등록, 검색)
│   │   ├── components/          #      - ProductFilters.tsx, ImageGallery.tsx, ProductSearch.tsx
│   │   ├── hooks/               #      - useProducts.ts
│   │   └── routes/              #      - HomePage.tsx, ProductDetailPage.tsx, NewProductPage.tsx
│   │
│   ├── profile/                 #    - 👤 프로필 (내 정보, 판매 내역, 관심 목록)
│   │   ├── components/          #      - UserProfile.tsx, EditProfileModal.tsx, UserFavorites.tsx
│   │   ├── hooks/               #      - useProfile.ts
│   │   └── routes/              #      - ProfilePage.tsx, EditProfilePage.tsx
│   │
│   ├── chat/                    #    - 💬 채팅
│   │   ├── components/          #      - ChatRoom.tsx, ChatMessage.tsx, ChatList.tsx
│   │   ├── hooks/               #      - useChat.tsx (WebSocket 로직 포함)
│   │   └── routes/              #      - ChatListPage.tsx
│   │
│   ├── review/                  #    - ⭐ 리뷰
│   │   ├── components/          #      - ReviewForm.tsx, ReviewList.tsx, StarRating.tsx
│   │   ├── hooks/               #      - useReviews.ts
│   │   └── routes/              #      - MyReviewsPage.tsx (내가 쓴 리뷰 목록)
│   │
│   ├── transaction/             #    - 💳 거래 및 결제
│   │   ├── components/          #      - TransactionHistory.tsx, PaymentForm.tsx, OrderStatus.tsx
│   │   ├── hooks/               #      - useTransactions.ts
│   │   └── routes/              #      - PurchaseHistoryPage.tsx
│   │
│   ├── notification/            #    - 🔔 알림
│   │   ├── components/          #      - NotificationList.tsx, NotificationItem.tsx
│   │   ├── hooks/               #      - useNotifications.ts
│   │   └── routes/              #      - NotificationsPage.tsx
│   │
│   └── admin/                   #    - 🛡️ 관리자
│       ├── components/          #      - AdminDashboard.tsx, UserManagementTable.tsx, ReportManagement.tsx
│       ├── hooks/               #      - useAdmin.ts
│       └── routes/              #      - AdminPage.tsx, AdminUserDetailsPage.tsx
│
├── 📁 pages/                     # 📄 기능에 속하지 않는 공통 페이지
│   └── error/                   #    - NotFoundPage.tsx, ErrorPage.tsx
│
├── 📁 lib/                       # 🛠️ 순수 유틸리티 및 상수
│   ├── constants.ts
│   ├── utils.ts
│   └── validation.ts
│
├── 📁 hooks/                     # 🎣 전역 커스텀 훅
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
│
├── 📁 services/                 # 📡 외부 통신 및 비즈니스 로직
│   ├── api/
│   └── external/
│
├── 📁 context/                  # 🌐 전역 상태 관리
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
│
├── 📁 types/                    # 📜 전역 타입 정의
│   ├── index.ts
│   ├── api.ts
│   ├── product.ts
│   ├── user.ts
│   └── ...
│
└── 📁 config/                   # ⚙️ 애플리케이션 설정
├── env.ts
└── constants.ts
```