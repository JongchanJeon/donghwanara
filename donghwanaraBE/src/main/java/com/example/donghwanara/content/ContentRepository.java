package com.example.donghwanara.content;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContentRepository extends JpaRepository<Content, Integer> {

    List<Content> findByBoardIdOrderBySeqAsc(Integer boardId);

    boolean existsByBoardIdAndSeq(Integer boardId, Integer seq);
}
