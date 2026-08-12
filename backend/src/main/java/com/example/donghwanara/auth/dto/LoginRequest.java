package com.example.donghwanara.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Email @NotBlank @Size(max = 120) String email,
        @NotBlank @Size(min = 4, max = 100) String password
) {
}
