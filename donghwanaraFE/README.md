# 동화나라 Frontend

AI로 동화를 만들고, 생성된 그림과 다국어 자막을 책처럼 감상할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- 프롬프트를 이용한 AI 동화 생성
- 동화 목록 및 내 동화 조회
- 페이지별 이미지와 한국어, 영어, 일본어 자막 제공
- MP3 음원 재생 및 음원이 없을 때 브라우저 TTS 사용
- 페이지 이동과 재생 진행 상태 표시
- 로그인 및 사용자 인증

## 기술 스택

- React 19
- TypeScript
- TanStack Router / TanStack Start
- Vite
- Tailwind CSS
- Lucide React

## 실행 방법

```bash
npm install
npm run dev
```

빌드 및 미리보기는 다음 명령어를 사용합니다.

```bash
npm run build
npm run preview
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 만들고 백엔드 API 주소를 설정합니다.

```env
VITE_API_BASE_URL=http://localhost:8080
```

환경 변수를 설정하지 않으면 기본값으로 `http://localhost:8080`을 사용합니다.

## 동화책 재생

동화책 상세 화면(`/book/:id`)은 페이지와 언어별 MP3 주소가 있으면 해당 음원을 재생합니다. MP3가 없고 자막이 있으면 브라우저의 Web Speech API를 이용해 TTS로 읽어 줍니다. 사용할 수 있는 음성과 발음은 브라우저 및 운영체제 환경에 따라 달라질 수 있습니다.
