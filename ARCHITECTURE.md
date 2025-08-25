## 백엔드 폴더 구조

---

```plaintext
src/
├── main.ts                         # 🚀 애플리케이션 시작점
├── app.module.ts                   # 🏠 루트 모듈
├── app.controller.ts               # 🏠 루트 컨트롤러
├── app.controller.spec.ts          # 🧪 루트 컨트롤러 테스트
├── app.service.ts                  # 🏠 루트 서비스
│
├── -------------------------------- (인증 및 보안)
│
├── 📁 auth/                        # 🔑 인증/인가 (로그인, JWT, 계정 잠금 해제)
│   ├── const/
│   │   └── auth-error-code.const.ts # - 🔴 인증 관련 에러 코드 상수
│   ├── decorator/
│   │   └── token.decorator.ts       # - 🎯 토큰 추출 데코레이터
│   ├── dto/
│   │   ├── request-unlock.dto.ts    # - 🔓 계정 잠금 해제 요청 DTO
│   │   └── verify-unlock.dto.ts     # - ✅ 계정 잠금 해제 검증 DTO
│   ├── entity/
│   │   └── refresh-token.entity.ts  # - 🔄 리프레시 토큰 엔티티
│   ├── guard/
│   │   ├── basic-token.guard.ts     # - 🛡️ Basic 토큰 가드
│   │   └── bearer-token.guard.ts    # - 🛡️ Bearer 토큰 가드
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
│
├── -------------------------------- (핵심 도메인)
│
├── 📁 users/                       # 👤 사용자 (프로필, 상태 관리, 역할 관리)
│   ├── const/
│   │   ├── roles.const.ts           # - 👑 사용자 역할 상수
│   │   ├── status.const.ts          # - 📊 사용자 상태 상수
│   │   └── users-error-code.const.ts # - 🔴 사용자 관련 에러 코드
│   ├── decorator/
│   │   └── user.decorator.ts        # - 🎯 사용자 정보 추출 데코레이터
│   ├── dto/
│   │   ├── create-user.dto.ts       # - ➕ 사용자 생성 DTO
│   │   └── update-user.dto.ts       # - ✏️ 사용자 수정 DTO
│   ├── entity/
│   │   └── users.entity.ts          # - 👤 사용자 엔티티
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
│
├── 📁 product/                     # 🛍️ 상품 (CRUD, 검색, 이미지 연동)
│   ├── const/
│   │   └── product.const.ts         # - 📋 상품 관련 상수 (상태, 조건, 거래타입)
│   ├── dto/
│   │   ├── create-product.dto.ts    # - ➕ 상품 생성 DTO
│   │   ├── get-product.dto.ts       # - 📄 상품 조회 DTO
│   │   └── update-product.dto.ts    # - ✏️ 상품 수정 DTO
│   ├── entity/
│   │   └── product.entity.ts        # - 🛍️ 상품 엔티티
│   ├── guard/
│   │   └── product-owner.guard.ts   # - 🛡️ 상품 소유자 검증 가드
│   ├── util/
│   │   └── enum-transform.util.ts   # - 🔄 Enum 변환 유틸리티
│   ├── product.module.ts
│   ├── product.controller.ts
│   └── product.service.ts
│
├── -------------------------------- (파일 업로드 및 미디어)
│
├── 📁 uploads/                     # 🖼️ 파일 업로드 (S3 연동 + 임시 파일 관리)
│   ├── dto/
│   │   ├── file.dto.ts              # - 📄 파일 정보 DTO (범용)
│   │   ├── image-commit.dto.ts      # - 🖼️ 이미지 최종 저장 DTO
│   │   └── upload-temp-response.dto.ts # - 📥 임시 업로드 응답 DTO
│   ├── entity/
│   │   ├── file.entity.ts           # - 📄 파일 메타데이터 엔티티 (상태 필드 포함)
│   │   └── product-image.entity.ts  # - 🛍️ 상품 이미지 연결 엔티티
│   ├── guard/
│   │   └── file-upload.guard.ts     # - 🛡️ 파일 타입/크기 검증 가드
│   ├── pipe/
│   │   └── file-validation.pipe.ts  # - 💧 파일 유효성 검증 파이프
│   ├── schedule/
│   │   └── cleanup.schedule.ts      # - 🧹 임시 파일 삭제 스케줄러
│   ├── service/
│   │   └── image-processing.service.ts # - 🖼️ 이미지 리사이징/최적화
│   ├── uploads.module.ts
│   ├── uploads.controller.ts
│   └── uploads.service.ts
│
├── -------------------------------- (로깅 및 알림)
│
├── 📁 logs/                        # 📝 로깅 시스템 (보안 이벤트, 사용자 활동)
│   ├── const/
│   │   ├── email-send-status.const.ts # - 📧 이메일 발송 상태 상수
│   │   └── password-change-method.const.ts # - 🔑 비밀번호 변경 방법 상수
│   ├── dto/
│   │   ├── email.sent.dto.ts        # - 📧 이메일 발송 로그 DTO
│   │   ├── login-failed.dto.ts      # - ❌ 로그인 실패 로그 DTO
│   │   ├── password-changed.dto.ts  # - 🔑 비밀번호 변경 로그 DTO
│   │   └── token-rotation-failed.dto.ts # - 🔄 토큰 회전 실패 로그 DTO
│   ├── entity/
│   │   ├── email-log.entity.ts      # - 📧 이메일 로그 엔티티
│   │   ├── login-attempt-log.entity.ts # - 🔐 로그인 시도 로그 엔티티
│   │   ├── password-change-log.entity.ts # - 🔑 비밀번호 변경 로그 엔티티
│   │   └── token-event-log.entity.ts # - 🎫 토큰 이벤트 로그 엔티티
│   ├── logs.module.ts
│   └── logs.service.ts
│
├── 📁 mail/                        # 📧 이메일 서비스 (비밀번호 리셋, 계정 잠금 해제)
│   ├── mail.listener.ts            # - 👂 이메일 이벤트 리스너
│   ├── mail.module.ts
│   └── mail.service.ts
│
├── 📁 templates/                   # 📄 이메일 템플릿
│   ├── password-reset.ejs          # - 🔑 비밀번호 리셋 템플릿
│   └── unlock-verification.ejs     # - 🔓 계정 잠금 해제 템플릿
│
├── -------------------------------- (인프라 및 외부 서비스)
│
├── 📁 s3/                          # ☁️ AWS S3 서비스
│   ├── s3.module.ts
│   └── s3.service.ts
│
├── 📁 supabase/                    # 🗄️ Supabase 연동 서비스
│   ├── supabase.module.ts
│   └── supabase.service.ts
│
├── -------------------------------- (공통 기능 / 인프라)
│
└── 📁 common/                      # ♻️ 공통 유틸리티 (카테고리/지역 관리)
    ├── decorator/
    │   └── is-public.decorator.ts   # - 🔓 공개 API 데코레이터
    ├── dto/
    │   └── page.dto.ts              # - 📄 페이지네이션 DTO
    ├── entity/
    │   ├── base.entity.ts           # - 🏗️ 기본 엔티티 (공통 필드)
    │   ├── category.entity.ts       # - 🏷️ 카테고리 엔티티
    │   └── region.entity.ts         # - 🌍 지역 엔티티
    ├── common.module.ts
    ├── common.controller.ts         # - 🌐 카테고리/지역 API 제공
    └── common.service.ts
```

## 프로젝트 루트 구조

---

```plaintext
📁 Seller-Re-NestJS/                   # 🏠 프로젝트 루트
├── backend/                           # 🖥️ NestJS 백엔드
│   ├── dist/                          # 📦 TypeScript 컴파일 결과물
│   ├── node_modules/                  # 📚 백엔드 의존성 패키지
│   ├── script/                        # 🛠️ 유틸리티 스크립트
│   │   ├── create-dummy-products.ts   # - 🛍️ 더미 상품 생성 스크립트
│   │   └── create-dummy-user.ts       # - 👤 더미 사용자 생성 스크립트
│   ├── src/                           # 📁 소스 코드 (위의 백엔드 구조)
│   ├── test/                          # 🧪 E2E 테스트
│   │   ├── app.e2e-spec.ts
│   │   └── jest-e2e.json
│   ├── uploads_temp/                  # 📁 임시 파일 저장 폴더
│   ├── nest-cli.json                  # ⚙️ NestJS CLI 설정
│   ├── package.json                   # 📦 백엔드 패키지 설정
│   ├── package-lock.json              # 🔒 백엔드 의존성 잠금
│   ├── tsconfig.json                  # 🔧 TypeScript 설정
│   ├── tsconfig.build.json            # 🔧 빌드용 TypeScript 설정
│   └── README.md                      # 📖 백엔드 설명서
│
├── frontend/                          # 🌐 React 프론트엔드
│   ├── node_modules/                  # 📚 프론트엔드 의존성 패키지
│   ├── public/                        # 🌐 정적 파일
│   │   └── vite.svg
│   ├── src/                           # 📁 소스 코드 (아래의 프론트엔드 구조)
│   ├── eslint.config.js               # 🔍 ESLint 설정
│   ├── index.html                     # 🏠 HTML 템플릿
│   ├── package.json                   # 📦 프론트엔드 패키지 설정
│   ├── tsconfig.json                  # 🔧 TypeScript 설정
│   ├── tsconfig.app.json              # 🔧 앱용 TypeScript 설정
│   ├── tsconfig.node.json             # 🔧 Node.js용 TypeScript 설정
│   ├── vite.config.ts                 # ⚡ Vite 빌드 도구 설정
│   └── README.md                      # 📖 프론트엔드 설명서
│
├── node_modules/                      # 📚 루트 레벨 의존성 패키지
├── .gitignore                         # 🚫 Git 무시 파일 목록
├── ARCHITECTURE.md                    # 📋 아키텍처 문서
├── README.md                          # 📖 프로젝트 전체 설명서
├── package.json                       # 📦 루트 패키지 설정 (워크스페이스)
└── package-lock.json                  # 🔒 루트 의존성 잠금 파일
```

## 프론트엔드 폴더 구조

---
```
src/
├── main.tsx                     # 🚀 애플리케이션 진입점
├── App.tsx                      # 🏠 메인 앱 컴포넌트
├── App.css                      # 🎨 전역 스타일
├── AppRoutes.tsx                # 🗺️ 라우팅 설정
├── index.css                    # 🎨 기본 CSS 스타일
├── vite-env.d.ts                # 🔧 Vite 환경 타입 정의
│
├── 📁 assets/                   # 🖼️ 정적 자산 (이미지, 아이콘)
│   └── react.svg                # - ⚛️ React 로고
│
├── 📁 components/               # 💎 재사용 UI 컴포넌트 라이브러리
│   └── shared/                  # - 공통 컴포넌트
│       ├── Header.tsx           # - 🔝 헤더 컴포넌트
│       ├── Header.css           # - 🔝 헤더 스타일
│       └── Footer.tsx           # - 🔻 푸터 컴포넌트
│
├── 📁 features/                 # ⭐ 애플리케이션의 핵심 기능 모음 (도메인)
│   │
│   ├── auth/                    # 🔑 인증 (로그인, 회원가입) [구현됨]
│   │   ├── components/          # - 인증 관련 컴포넌트
│   │   │   ├── LoginForm.tsx    # - 📝 로그인 폼
│   │   │   ├── LoginPage.css    # - 📝 로그인 페이지 스타일
│   │   │   ├── RegisterForm.tsx # - 📝 회원가입 폼
│   │   │   ├── RegisterPage.css # - 📝 회원가입 페이지 스타일
│   │   │   └── SocialLoginButtons.tsx # - 🔗 소셜 로그인 버튼
│   │   ├── hooks/               # - 인증 관련 훅
│   │   │   └── useAuth.ts       # - 🎣 인증 커스텀 훅
│   │   └── routes/              # - 인증 관련 페이지
│   │       ├── LoginPage.tsx    # - 🔐 로그인 페이지
│   │       ├── RegisterPage.tsx # - 📝 회원가입 페이지
│   │       ├── WelcomePage.tsx  # - 👋 환영 페이지
│   │       └── WelcomePage.css  # - 👋 환영 페이지 스타일
│   │
│   └── products/                # 🛍️ 상품 (목록, 상세, 등록, 검색) [구현됨]
│       ├── components/          # - 상품 관련 컴포넌트
│       │   ├── HomePage.css     # - 🏠 홈페이지 스타일
│       │   ├── ImageGallery.tsx # - 🖼️ 이미지 갤러리
│       │   ├── ProductFilters.tsx # - 🔍 상품 필터
│       │   ├── ProductFilters.css # - 🔍 상품 필터 스타일
│       │   ├── ProductSearch.tsx # - 🔍 상품 검색
│       │   └── ProductSearch.css # - 🔍 상품 검색 스타일
│       ├── hooks/               # - 상품 관련 훅
│       │   └── useProducts.ts   # - 🎣 상품 커스텀 훅
│       └── routes/              # - 상품 관련 페이지
│           ├── HomePage.tsx     # - 🏠 홈페이지 (상품 목록)
│           ├── NewProductPage.tsx # - ➕ 새 상품 등록 페이지
│           ├── NewProductPage.css # - ➕ 새 상품 등록 페이지 스타일
│           ├── ProductDetailPage.tsx # - 📄 상품 상세 페이지
│           ├── ProductDetailPage.css # - 📄 상품 상세 페이지 스타일
│           └── UpDateProductPage.tsx # - ✏️ 상품 수정 페이지
```