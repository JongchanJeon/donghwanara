package com.example.donghwanara.auth.dto;

public record AuthResponse(
        String token,
        UserResponse user
) {
}
