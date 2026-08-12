package com.example.donghwanara.board;

import com.example.donghwanara.board.dto.BoardContentsCreateRequest;
import com.example.donghwanara.board.dto.BoardContentsCreateResponse;
import com.example.donghwanara.board.dto.BoardRequest;
import com.example.donghwanara.board.dto.BoardResponse;
import com.example.donghwanara.content.Content;
import com.example.donghwanara.content.ContentRepository;
import com.example.donghwanara.content.dto.ContentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final ContentRepository contentRepository;

    @Transactional
    public BoardResponse create(BoardRequest request) {
        Board board = new Board(request.title(), request.contents(), request.summary(), request.status());
        return BoardResponse.from(boardRepository.save(board));
    }

    @Transactional
    public BoardContentsCreateResponse createWithContents(BoardContentsCreateRequest request) {
        BoardRequest boardRequest = request.board();
        Board board = boardRepository.save(new Board(
                boardRequest.title(),
                boardRequest.contents(),
                boardRequest.summary(),
                boardRequest.status()
        ));

        List<Content> contents = request.contents()
                .stream()
                .map(contentRequest -> new Content(
                        board,
                        contentRequest.seq(),
                        contentRequest.photoPath(),
                        contentRequest.subtitleKo(),
                        contentRequest.subtitleEn(),
                        contentRequest.subtitleJp(),
                        contentRequest.sceneDescriptionKo(),
                        contentRequest.sceneDescriptionEn(),
                        contentRequest.sceneDescriptionJp(),
                        contentRequest.audioKoPath(),
                        contentRequest.audioEnPath(),
                        contentRequest.audioJpPath()
                ))
                .toList();

        List<ContentResponse> contentResponses = contentRepository.saveAll(contents)
                .stream()
                .map(ContentResponse::from)
                .toList();

        return new BoardContentsCreateResponse(BoardResponse.from(board), contentResponses);
    }
}
