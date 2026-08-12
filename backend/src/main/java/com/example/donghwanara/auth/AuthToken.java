package com.example.donghwanara.auth;

import com.example.donghwanara.member.Member;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "auth_tokens",
        uniqueConstraints = @UniqueConstraint(name = "uk_auth_tokens_token", columnNames = "token")
)
public class AuthToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;

    @Column(name = "expires_date", nullable = false)
    private LocalDateTime expiresDate;

    @Column(name = "revoked_date")
    private LocalDateTime revokedDate;

    public AuthToken(String token, Member member, LocalDateTime expiresDate) {
        this.token = token;
        this.member = member;
        this.expiresDate = expiresDate;
    }

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = LocalDateTime.now();
        }
    }

    public boolean isActive(LocalDateTime now) {
        return revokedDate == null && expiresDate.isAfter(now);
    }

    public void revoke() {
        this.revokedDate = LocalDateTime.now();
    }
}
