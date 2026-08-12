package com.example.donghwanara.story.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryGenerateRequest(
        @Size(max = 50) String title,
        @Size(max = 20) String heroName,
        @NotBlank @Size(max = 500) String prompt
) {
}
