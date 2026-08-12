package com.example.donghwanara.board.dto;

import com.example.donghwanara.content.dto.ContentRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BoardContentsCreateRequest(
        @Valid @NotNull BoardRequest board,
        @Valid @NotNull @Size(min = 1) List<ContentRequest> contents
) {
}
