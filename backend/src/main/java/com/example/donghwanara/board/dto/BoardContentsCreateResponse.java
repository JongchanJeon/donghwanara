package com.example.donghwanara.board.dto;

import com.example.donghwanara.content.dto.ContentResponse;

import java.util.List;

public record BoardContentsCreateResponse(
        BoardResponse board,
        List<ContentResponse> contents
) {
}
