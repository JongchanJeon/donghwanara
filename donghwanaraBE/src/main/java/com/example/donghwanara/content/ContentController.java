package com.example.donghwanara.content;

import com.example.donghwanara.board.Board;
import com.example.donghwanara.board.BoardRepository;
import com.example.donghwanara.content.dto.ContentRequest;
import com.example.donghwanara.content.dto.ContentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ContentController {

    private final BoardRepository boardRepository;
    private final ContentRepository contentRepository;

    @GetMapping("/boards/{boardId}/contents")
    public List<ContentResponse> findByBoard(@PathVariable Integer boardId) {
        findBoard(boardId);
        return contentRepository.findByBoardIdOrderBySeqAsc(boardId)
                .stream()
                .map(ContentResponse::from)
                .toList();
    }

    @GetMapping("/contents/{id}")
    public ContentResponse findOne(@PathVariable Integer id) {
        return ContentResponse.from(findContent(id));
    }

    @PostMapping("/boards/{boardId}/contents")
    @ResponseStatus(HttpStatus.CREATED)
    public ContentResponse create(
            @PathVariable Integer boardId,
            @Valid @RequestBody ContentRequest request
    ) {
        Board board = findBoard(boardId);
        Content content = new Content(
                board,
                request.seq(),
                request.photoPath(),
                request.subtitleKo(),
                request.subtitleEn(),
                request.subtitleJp(),
                request.sceneDescriptionKo(),
                request.sceneDescriptionEn(),
                request.sceneDescriptionJp(),
                request.audioKoPath(),
                request.audioEnPath(),
                request.audioJpPath()
        );
        return ContentResponse.from(contentRepository.save(content));
    }

    @PutMapping("/contents/{id}")
    public ContentResponse update(@PathVariable Integer id, @Valid @RequestBody ContentRequest request) {
        Content content = findContent(id);
        content.update(
                request.seq(),
                request.photoPath(),
                request.subtitleKo(),
                request.subtitleEn(),
                request.subtitleJp(),
                request.sceneDescriptionKo(),
                request.sceneDescriptionEn(),
                request.sceneDescriptionJp(),
                request.audioKoPath(),
                request.audioEnPath(),
                request.audioJpPath()
        );
        return ContentResponse.from(contentRepository.save(content));
    }

    @DeleteMapping("/contents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id) {
        Content content = findContent(id);
        contentRepository.delete(content);
    }

    private Board findBoard(Integer id) {
        return boardRepository.findByIdAndDeletedDateIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
    }

    private Content findContent(Integer id) {
        return contentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found"));
    }
}
