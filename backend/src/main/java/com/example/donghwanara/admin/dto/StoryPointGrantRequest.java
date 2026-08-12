package com.example.donghwanara.admin.dto;

import jakarta.validation.constraints.Min;

public record StoryPointGrantRequest(
        @Min(1) int amount
) {
}
