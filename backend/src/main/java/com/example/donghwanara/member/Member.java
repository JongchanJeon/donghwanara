package com.example.donghwanara.member;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
        name = "members",
        uniqueConstraints = @UniqueConstraint(name = "uk_members_email", columnNames = "email")
)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 120)
    private String email;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "story_points", nullable = false)
    private Integer storyPoints;

    @Column(name = "created_date", nullable = false)
    private LocalDateTime createdDate;

    @Column(name = "deleted_date")
    private LocalDateTime deletedDate;

    public Member(String email, String name, String passwordHash) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
        this.storyPoints = 0;
    }

    @PrePersist
    void prePersist() {
        if (createdDate == null) {
            createdDate = LocalDateTime.now();
        }
        if (storyPoints == null) {
            storyPoints = 0;
        }
    }

    public void addStoryPoints(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }
        this.storyPoints += amount;
    }

    public boolean hasStoryPoint() {
        return storyPoints != null && storyPoints > 0;
    }

    public void consumeStoryPoint() {
        if (!hasStoryPoint()) {
            throw new IllegalStateException("story point is empty");
        }
        this.storyPoints -= 1;
    }
}
