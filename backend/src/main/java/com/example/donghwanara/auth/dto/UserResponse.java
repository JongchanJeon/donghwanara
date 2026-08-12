package com.example.donghwanara.auth.dto;

import com.example.donghwanara.member.Member;

public record UserResponse(
        Integer id,
        String email,
        String name,
        Integer storyPoints
) {
    public static UserResponse from(Member member) {
        return new UserResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getStoryPoints()
        );
    }
}
