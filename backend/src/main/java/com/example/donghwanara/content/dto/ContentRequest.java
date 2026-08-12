package com.example.donghwanara.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ContentRequest(
        @NotNull Integer seq,
        @NotBlank @Size(max = 256) String photoPath,
        @NotBlank @Size(max = 1000) String subtitleKo,
        @NotBlank @Size(max = 1000) String subtitleEn,
        @NotBlank @Size(max = 1000) String subtitleJp,
        @Size(max = 1000) String sceneDescriptionKo,
        @Size(max = 1000) String sceneDescriptionEn,
        @Size(max = 1000) String sceneDescriptionJp,
        @NotBlank @Size(max = 256) String audioKoPath,
        @NotBlank @Size(max = 256) String audioEnPath,
        @NotBlank @Size(max = 256) String audioJpPath
) {
}
