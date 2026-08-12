package com.example.donghwanara.board.dto;

import com.example.donghwanara.board.Board;

import java.time.LocalDateTime;

public record BoardResponse(
        Integer id,
        String title,
        String contents,
        String summary,
        Integer status,
        LocalDateTime createdDate,
        LocalDateTime deletedDate
) {
    public static BoardResponse from(Board board) {
        return new BoardResponse(
                board.getId(),
                board.getTitle(),
                board.getContents(),
                board.getSummary(),
                board.getStatus(),
                board.getCreatedDate(),
                board.getDeletedDate()
        );
    }
}
