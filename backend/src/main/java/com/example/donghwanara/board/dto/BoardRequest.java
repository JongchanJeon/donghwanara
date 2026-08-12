package com.example.donghwanara.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BoardRequest(
        @NotBlank @Size(max = 50) String title,
        @Size(max = 256) String contents,
        @NotBlank @Size(max = 256) String summary,
        @NotNull Integer status
) {
}
