# Ubuntu Deployment Guide

이 문서는 FE와 BE를 같은 Ubuntu 서버에 올리고, 각각 다른 포트로 통신하게 하는 기준 설정입니다.

- Public IP: `123.125.125.1`
- FE: `http://123.125.125.1:6060`
- BE: `http://123.125.125.1:7070`
- FE API 호출 기준: `http://123.125.125.1:7070/api/...`

## 1. FE와 BE 통신 구조

```text
Browser
  -> http://123.125.125.1:6060         FE 화면 접속
  -> http://123.125.125.1:7070/api/... BE API 호출
```

현재 FE 코드는 `/api/auth/login`, `/api/boards`처럼 API 경로에 `/api`가 포함되어 있습니다.
따라서 FE의 운영 환경변수에는 백엔드 origin만 넣습니다.

```env
VITE_API_BASE_URL=http://123.125.125.1:7070
```

중요: `VITE_API_BASE_URL`은 빌드 시점에 들어갑니다. 값을 변경하면 반드시 다시 빌드해야 합니다.

```bash
npm run build
pm2 restart donghwanara-fe
```

## 2. 서버 기본 설치

```bash
sudo apt update
sudo apt install -y git curl openjdk-17-jre

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pm2
pm2 startup systemd
```

`pm2 startup systemd` 실행 후 출력되는 `sudo env PATH=... pm2 startup ...` 명령을 한 번 더 실행해야 서버 재부팅 후 PM2가 자동 복구됩니다.

## 3. FE 배포 및 기동

```bash
sudo mkdir -p /srv/donghwanara
sudo chown -R $USER:$USER /srv/donghwanara
cd /srv/donghwanara

git clone <FE_REPOSITORY_URL> donghwanaraFE
cd donghwanaraFE

cp .env.production.example .env.production
npm ci
npm run build
pm2 start npm --name donghwanara-fe -- run start
pm2 save
```

`package.json`의 `start`는 아래처럼 동작합니다.

```bash
vite preview --host 0.0.0.0 --port 6060
```

FE 업데이트 시:

```bash
cd /srv/donghwanara/donghwanaraFE
git pull
npm ci
npm run build
pm2 restart donghwanara-fe
pm2 save
```

## 4. BE 배포 및 기동

WAR 파일 이름 예시는 `donghwanara-be.war`입니다.

```bash
sudo mkdir -p /srv/donghwanara/be
sudo chown -R $USER:$USER /srv/donghwanara/be
cd /srv/donghwanara/be

java -jar donghwanara-be.war --server.address=0.0.0.0 --server.port=7070
```

운영에서는 systemd 서비스 등록을 권장합니다.

```bash
sudo vi /etc/systemd/system/donghwanara-be.service
```

```ini
[Unit]
Description=Donghwanara Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/srv/donghwanara/be
ExecStart=/usr/bin/java -jar /srv/donghwanara/be/donghwanara-be.war --server.address=0.0.0.0 --server.port=7070
Restart=always
RestartSec=5
SuccessExitStatus=143

[Install]
WantedBy=multi-user.target
```

적용:

```bash
sudo systemctl daemon-reload
sudo systemctl enable donghwanara-be
sudo systemctl start donghwanara-be
sudo systemctl status donghwanara-be
```

BE 업데이트 시:

```bash
sudo systemctl stop donghwanara-be
cp donghwanara-be.war /srv/donghwanara/be/donghwanara-be.war
sudo systemctl start donghwanara-be
sudo journalctl -u donghwanara-be -f
```

## 5. BE CORS 설정 필수

FE와 BE의 포트가 다르기 때문에 브라우저 기준으로 다른 origin입니다.
따라서 BE에서 아래 origin을 허용해야 합니다.

```text
http://123.125.125.1:6060
```

Spring Boot 예시:

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://123.125.125.1:6060")
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(false);
    }
}
```

JWT를 `Authorization: Bearer ...` 헤더로 쓰는 현재 FE 구조에서는 보통 `allowCredentials(false)`로 충분합니다.
쿠키 기반 인증을 쓰는 경우에는 CORS와 SameSite/Secure 설정을 별도로 맞춰야 합니다.

## 6. 방화벽 및 클라우드 보안그룹

Ubuntu UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 6060/tcp
sudo ufw allow 7070/tcp
sudo ufw enable
sudo ufw status
```

클라우드 보안그룹에서도 inbound를 열어야 합니다.

```text
TCP 22   SSH
TCP 6060 FE
TCP 7070 BE
```

## 7. 기동 순서

```bash
sudo systemctl start donghwanara-be
pm2 start npm --name donghwanara-fe -- run start
pm2 save
```

상태 확인:

```bash
pm2 status
sudo systemctl status donghwanara-be
```

로그 확인:

```bash
pm2 logs donghwanara-fe
sudo journalctl -u donghwanara-be -f
```

## 8. 접속 및 통신 확인

서버 내부:

```bash
curl -I http://127.0.0.1:6060
curl -I http://127.0.0.1:7070/api/boards
```

외부:

```bash
curl -I http://123.125.125.1:6060
curl -I http://123.125.125.1:7070/api/boards
```

인증이 필요한 API는 `401`이 나와도 서버 연결 자체는 정상일 수 있습니다.
FE 화면에서 API 호출이 실패하면 브라우저 개발자도구 Network 탭에서 요청 URL이 `http://123.125.125.1:7070/api/...`인지 먼저 확인하세요.

## 9. 주의사항

- `.env.production`을 만든 뒤 `npm run build`를 해야 FE에 API 주소가 반영됩니다.
- 운영에서 `VITE_API_BASE_URL=http://localhost:7070`을 쓰면 안 됩니다. 사용자의 PC 기준 localhost가 되어 BE에 접근하지 못합니다.
- BE는 `--server.address=0.0.0.0 --server.port=7070`으로 외부 접근 가능하게 띄웁니다.
- FE는 `--host 0.0.0.0 --port 6060`으로 외부 접근 가능하게 띄웁니다.
- 포트를 직접 공개하는 방식은 빠르게 배포하기 좋지만, 실서비스에서는 도메인과 HTTPS를 붙이고 Nginx로 `80/443`만 공개하는 구성을 권장합니다.
- DB 비밀번호, JWT secret, 외부 API key는 Git에 올리지 말고 서버 환경변수나 별도 설정 파일로 관리하세요.
