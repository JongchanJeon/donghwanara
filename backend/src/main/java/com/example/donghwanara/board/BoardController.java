package com.example.donghwanara.board;

import com.example.donghwanara.auth.AuthService;
import com.example.donghwanara.board.dto.BoardContentsCreateRequest;
import com.example.donghwanara.board.dto.BoardContentsCreateResponse;
import com.example.donghwanara.board.dto.BoardRequest;
import com.example.donghwanara.board.dto.BoardResponse;
import com.example.donghwanara.member.Member;
import jakarta.servlet.http.HttpServletRequest;
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
@RequestMapping("/api/boards")
public class BoardController {

    private final BoardRepository boardRepository;
    private final BoardService boardService;
    private final AuthService authService;

    @GetMapping
    public List<BoardResponse> findAll() {
        return boardRepository.findByDeletedDateIsNullOrderByIdDesc()
                .stream()
                .map(BoardResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public BoardResponse findOne(@PathVariable Integer id) {
        return BoardResponse.from(findBoard(id));
    }

    @GetMapping("/mine")
    public List<BoardResponse> findMine(HttpServletRequest httpRequest) {
        Member member = authService.requireAuthenticated(httpRequest);
        return boardRepository.findByMemberIdAndDeletedDateIsNullOrderByIdDesc(member.getId())
                .stream()
                .map(BoardResponse::from)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BoardResponse create(@Valid @RequestBody BoardRequest request) {
        return boardService.create(request);
    }

    @PostMapping("/with-contents")
    @ResponseStatus(HttpStatus.CREATED)
    public BoardContentsCreateResponse createWithContents(
            @Valid @RequestBody BoardContentsCreateRequest request
    ) {
        return boardService.createWithContents(request);
    }

    @PutMapping("/{id}")
    public BoardResponse update(@PathVariable Integer id, @Valid @RequestBody BoardRequest request) {
        Board board = findBoard(id);
        board.update(request.title(), request.contents(), request.summary(), request.status());
        return BoardResponse.from(boardRepository.save(board));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Integer id, HttpServletRequest httpRequest) {
        Board board = findBoard(id);
        if (board.getMember() != null) {
            Member member = authService.requireAuthenticated(httpRequest);
            if (!board.isOwnedBy(member)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the owner can delete this board");
            }
        }
        board.delete();
        boardRepository.save(board);
    }

    private Board findBoard(Integer id) {
        return boardRepository.findByIdAndDeletedDateIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
    }
}
