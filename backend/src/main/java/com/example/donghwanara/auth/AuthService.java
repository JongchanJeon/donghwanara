package com.example.donghwanara.auth;

import com.example.donghwanara.auth.dto.AuthResponse;
import com.example.donghwanara.auth.dto.LoginRequest;
import com.example.donghwanara.auth.dto.SignupRequest;
import com.example.donghwanara.auth.dto.UserResponse;
import com.example.donghwanara.member.Member;
import com.example.donghwanara.member.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int TOKEN_DAYS = 14;

    private final MemberRepository memberRepository;
    private final AuthTokenRepository authTokenRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());
        if (memberRepository.existsByEmailAndDeletedDateIsNull(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }

        Member member = memberRepository.save(new Member(
                email,
                request.name().trim(),
                passwordEncoder.encode(request.password())
        ));
        return issue(member);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Member member = memberRepository.findByEmailAndDeletedDateIsNull(normalizeEmail(request.email()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), member.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        return issue(member);
    }

    @Transactional
    public void logout(HttpServletRequest request) {
        extractBearerToken(request)
                .flatMap(authTokenRepository::findByToken)
                .ifPresent(token -> {
                    token.revoke();
                    authTokenRepository.save(token);
                });
    }

    @Transactional(readOnly = true)
    public Optional<Member> resolveAuthenticated(HttpServletRequest request) {
        return extractBearerToken(request)
                .flatMap(authTokenRepository::findByToken)
                .filter(token -> token.isActive(LocalDateTime.now()))
                .map(AuthToken::getMember)
                .filter(member -> member.getDeletedDate() == null);
    }

    @Transactional(readOnly = true)
    public Member requireAuthenticated(HttpServletRequest request) {
        return resolveAuthenticated(request)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
    }

    private AuthResponse issue(Member member) {
        AuthToken authToken = authTokenRepository.save(new AuthToken(
                UUID.randomUUID().toString(),
                member,
                LocalDateTime.now().plusDays(TOKEN_DAYS)
        ));
        return new AuthResponse(authToken.getToken(), UserResponse.from(member));
    }

    private Optional<String> extractBearerToken(HttpServletRequest request) {
        String value = request.getHeader("Authorization");
        if (!StringUtils.hasText(value) || !value.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = value.substring("Bearer ".length()).trim();
        return StringUtils.hasText(token) ? Optional.of(token) : Optional.empty();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
