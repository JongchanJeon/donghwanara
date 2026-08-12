# 동화나라 (Donghwanara)

OpenAI API를 활용해 이야기, 장면 이미지, 한국어/영어/일본어 음성을 생성하고 동화책으로 관리하는 Spring Boot 백엔드 프로젝트입니다.

## 주요 기능

- 회원가입, 로그인 및 Bearer Token 인증
- 동화책과 페이지 콘텐츠 CRUD
- AI 기반 이야기, 이미지, 다국어 음성 생성
- 생성된 미디어 파일 제공
- 관리자용 회원 스토리 포인트 지급

## 기술 스택

- Java 21
- Spring Boot 3.5
- Spring Web, Spring Data JPA, Validation
- MariaDB
- Gradle
- OpenAI API

## 실행 방법

### 1. 데이터베이스 준비

MariaDB에서 [`docs/mariadb-ddl.sql`](docs/mariadb-ddl.sql)을 실행합니다.

### 2. 환경 변수 설정

PowerShell 기준 예시입니다.

```powershell
$env:DB_URL="jdbc:mariadb://localhost:3306/donghwanara"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your-password"
$env:OPENAI_API_KEY="your-openai-api-key"
$env:ADMIN_API_KEY="your-admin-api-key"
```

### 3. 애플리케이션 실행

```powershell
.\gradlew.bat bootRun
```

서버는 기본적으로 `http://localhost:7070`에서 실행됩니다.

## 주요 API

| 기능 | 경로 |
| --- | --- |
| 인증 | `/api/auth` |
| 동화책 관리 | `/api/boards` |
| 페이지 콘텐츠 관리 | `/api/contents` |
| AI 동화 생성 | `POST /api/stories/generate` |
| 관리자 기능 | `/api/admin` |

인증이 필요한 API는 `Authorization: Bearer <token>` 헤더를 사용합니다. 생성된 이미지와 음성은 기본적으로 `generated-media` 디렉터리에 저장됩니다.

## 테스트

```powershell
.\gradlew.bat test
```
