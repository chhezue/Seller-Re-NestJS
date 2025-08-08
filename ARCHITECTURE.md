## 백엔드 폴더 구조

---

```plaintext
src/
├── main.ts                         # 🚀 애플리케이션 시작점
├── app.module.ts                   # 🏠 루트 모듈
├── app.controller.ts               # 🏠 루트 컨트롤러
├── app.service.ts                  # 🏠 루트 서비스
│
├── -------------------------------- (인증 및 보안)
│
├── 📁 auth/                        # 🔑 인증/인가 (로그인, JWT, 소셜로그인, 가드)
│   ├── dto/
│   │   ├── login-failed.dto.ts
│   │   └── register-user.dto.ts
│   ├── guard/
│   │   ├── basic-token.guard.ts
│   │   └── bearer-token.guard.ts
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
│
├── -------------------------------- (핵심 도메인)
│
├── 📁 users/                       # 👤 사용자 (프로필, 신고, 소셜 계정)
│   ├── const/
│   │   ├── roles.const.ts
│   │   └── status.const.ts
│   ├── decorator/
│   │   └── user.decorator.ts
│   ├── entity/
│   │   └── users.entity.ts
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
│
├── 📁 product/                     # 🛍️ 상품 (CRUD, 검색, 이미지, 즐겨찾기, 신고)
│   ├── const/
│   │   └── product.const.ts
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   ├── get-product.dto.ts
│   │   └── update-product.dto.ts
│   ├── entity/
│   │   └── product.entity.ts
│   ├── guard/
│   │   └── product-owner.guard.ts
│   ├── util/
│   │   └── enum-transform.util.ts
│   ├── product.module.ts
│   ├── product.controller.ts
│   └── product.service.ts
│
├── -------------------------------- (파일 업로드 및 미디어)
│
├── 📁 uploads/                     # 🖼️ 파일 업로드 (AWS S3 연동 + 임시 파일 관리)
│   ├── dto/
│   │   ├── upload-temp-response.dto.ts # - 📥 임시 업로드 응답 DTO
│   │   └── file.dto.ts             # - 📄 파일 정보 DTO (범용)
│   ├── entity/
│   │   ├── file.entity.ts          # - 📄 파일 메타데이터 저장 엔티티 (상태 필드 포함)
│   │   ├── product-image.entity.ts # - 상품 이미지 연결 엔티티
│   │   └── user-avatar.entity.ts   # - 사용자 프로필 이미지 엔티티
│   ├── guard/
│   │   └── file-upload.guard.ts    # - 🛡️ 파일 타입/크기 검증 (범용)
│   ├── pipe/
│   │   └── file-validation.pipe.ts # - 💧 파일 유효성 검증 파이프
│   ├── service/
│   │   ├── aws-s3.service.ts       # - ☁️ AWS S3 업로드 로직
│   │   └── image-processing.service.ts # - 🖼️ 이미지 리사이징/최적화
│   ├── schedule/
│   │   └── cleanup.schedule.ts     # - 🧹 임시 파일 삭제 스케줄러
│   ├── uploads.module.ts
│   ├── uploads.controller.ts
│   └── uploads.service.ts
│
├── -------------------------------- (보조 도메인 및 기능)
│
├── 📁 chat/                        # 💬 실시간 채팅 (예정)
│   ├── dto/
│   ├── entity/
│   ├── chat.module.ts
│   ├── chat.gateway.ts             # - WebSocket 로직 담당
│   └── chat.service.ts
│
├── 📁 reviews/                     # ⭐ 리뷰 및 평점 (예정)
│   ├── dto/
│   ├── entity/
│   ├── reviews.module.ts
│   ├── reviews.controller.ts
│   └── reviews.service.ts
│
├── 📁 transactions/               # 💳 거래 내역 (예정)
│   ├── entity/
│   ├── transactions.module.ts
│   ├── transactions.controller.ts
│   └── transactions.service.ts
│
├── 📁 admin/                       # 🛡️ 관리자 기능 (예정)
│   ├── admin.module.ts
│   ├── admin.controller.ts
│   └── admin.service.ts
│
├── -------------------------------- (공통 기능 / 인프라)
│
├── 📁 common/                      # ♻️ 공통 유틸리티 (현재 카테고리/지역 관리 포함)
│   ├── decorator/
│   │   └── is-public.decorator.ts
│   ├── dto/
│   │   └── page.dto.ts             # - 페이지네이션 DTO
│   ├── entity/
│   │   ├── base.entity.ts
│   │   ├── category.entity.ts
│   │   ├── login-attempt-log.entity.ts
│   │   └── region.entity.ts
│   ├── common.module.ts
│   ├── common.controller.ts        # - 카테고리/지역 API 제공
│   └── common.service.ts
│
├── 📁 logs/                        # 📝 로깅 시스템
│   ├── logs.module.ts
│   └── logs.service.ts
│
├── 📁 supabase/                    # 🗄️ Supabase 연동
│   ├── supabase.module.ts
│   └── supabase.service.ts
│
├── 📁 notifications/               # 🔔 알림 (예정)
│   ├── notifications.module.ts
│   ├── notifications.gateway.ts
│   └── notifications.service.ts
│
└── 📁 config/                      # ⚙️ 환경설정 (예정)
    ├── database.config.ts
    ├── jwt.config.ts
    ├── aws.config.ts
    └── s3.config.ts                # - 🪣 S3 업로드 설정
```

## 프로젝트 루트 구조

---

```plaintext
📁 Seller-Re-NestJS/                   # 🏠 프로젝트 루트
├── backend/                           # 🖥️ NestJS 백엔드
│   └── (위의 백엔드 구조)
├── frontend/                          # 🌐 React 프론트엔드
│   └── (아래의 프론트엔드 구조)
├── uploads_temp/                      # 📁 임시 파일 저장 폴더 (.gitignore에 추가)
├── .env                              # 🔑 환경변수 (S3 키, 임시 폴더 경로 등)
├── .gitignore                        # 🚫 Git 무시 파일 목록
├── ARCHITECTURE.md                   # 📋 아키텍처 문서
├── README.md                         # 📖 프로젝트 설명서
├── package.json                      # 📦 루트 패키지 설정
└── package-lock.json                 # 🔒 루트 의존성 잠금 파일
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
│   ├── auth/                    #    - 🔑 인증 (로그인, 회원가입) [구현됨]
│   │   ├── components/          #      - LoginForm.tsx, RegisterForm.tsx, SocialLoginButtons.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── LoginPage.css
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── RegisterPage.css
│   │   │   └── SocialLoginButtons.tsx
│   │   ├── hooks/               #      - useAuth.ts
│   │   │   └── useAuth.ts
│   │   └── routes/              #      - LoginPage.tsx, RegisterPage.tsx, WelcomePage.tsx
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── WelcomePage.css
│   │       └── WelcomePage.tsx
│   │
│   ├── products/                #    - 🛍️ 상품 (목록, 상세, 등록, 검색) [부분 구현됨]
│   │   ├── components/          #      - ProductFilters.tsx, ImageGallery.tsx, ProductSearch.tsx
│   │   │   └── HomePage.css
│   │   ├── hooks/               #      - useProducts.ts (예정)
│   │   └── routes/              #      - HomePage.tsx, ProductDetailPage.tsx, NewProductPage.tsx
│   │       └── HomePage.tsx
│   │
│   ├── uploads/                 #    - 🖼️ 파일 업로드 (이미지 업로드, 미리보기) [예정]
│   │   ├── components/          #      - ImageUploader.tsx, ImagePreview.tsx, DragDropZone.tsx
│   │   │   ├── ImageUploader.tsx        #        - 📤 메인 이미지 업로드 컴포넌트
│   │   │   ├── ImagePreview.tsx         #        - 👀 이미지 미리보기 컴포넌트
│   │   │   ├── DragDropZone.tsx         #        - 🎯 드래그 앤 드롭 영역
│   │   │   └── ProgressBar.tsx          #        - 📊 업로드 진행률 표시
│   │   ├── hooks/               #      - useImageUpload.ts, useFileValidation.ts
│   │   │   ├── useImageUpload.ts        #        - 🎣 이미지 업로드 훅 (임시 → S3)
│   │   │   ├── useFileValidation.ts     #        - ✅ 파일 유효성 검증 훅
│   │   │   └── useProgressTracker.ts    #        - 📈 업로드 진행률 추적 훅
│   │   └── utils/               #      - imageUtils.ts, fileValidation.ts
│   │       ├── imageUtils.ts            #        - 🖼️ 이미지 유틸리티 (리사이징, 압축)
│   │       ├── fileValidation.ts        #        - 📋 파일 검증 로직
│   │       └── uploadConfig.ts          #        - ⚙️ 업로드 설정 (크기 제한, 허용 타입)
│   │
│   ├── profile/                 #    - 👤 프로필 (내 정보, 판매 내역, 관심 목록) [예정]
│   │   ├── components/          #      - UserProfile.tsx, EditProfileModal.tsx, UserFavorites.tsx
│   │   ├── hooks/               #      - useProfile.ts
│   │   └── routes/              #      - ProfilePage.tsx, EditProfilePage.tsx
│   │
│   ├── chat/                    #    - 💬 채팅 [예정]
│   │   ├── components/          #      - ChatRoom.tsx, ChatMessage.tsx, ChatList.tsx
│   │   ├── hooks/               #      - useChat.tsx (WebSocket 로직 포함)
│   │   └── routes/              #      - ChatListPage.tsx
│   │
│   ├── review/                  #    - ⭐ 리뷰 [예정]
│   │   ├── components/          #      - ReviewForm.tsx, ReviewList.tsx, StarRating.tsx
│   │   ├── hooks/               #      - useReviews.ts
│   │   └── routes/              #      - MyReviewsPage.tsx (내가 쓴 리뷰 목록)
│   │
│   ├── transaction/             #    - 💳 거래 및 결제 [예정]
│   │   ├── components/          #      - TransactionHistory.tsx, PaymentForm.tsx, OrderStatus.tsx
│   │   ├── hooks/               #      - useTransactions.ts
│   │   └── routes/              #      - PurchaseHistoryPage.tsx
│   │
│   ├── notification/            #    - 🔔 알림 [예정]
│   │   ├── components/          #      - NotificationList.tsx, NotificationItem.tsx
│   │   ├── hooks/               #      - useNotifications.ts
│   │   └── routes/              #      - NotificationsPage.tsx
│   │
│   └── admin/                   #    - 🛡️ 관리자 [예정]
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