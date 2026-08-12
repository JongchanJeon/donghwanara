package com.example.donghwanara.config;

import com.example.donghwanara.board.Board;
import com.example.donghwanara.board.BoardRepository;
import com.example.donghwanara.content.Content;
import com.example.donghwanara.content.ContentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TestDataInitializer implements CommandLineRunner {

    private final BoardRepository boardRepository;
    private final ContentRepository contentRepository;

    @Override
    public void run(String... args) {
        Board firstBook = boardRepository.findByTitleAndDeletedDateIsNull("토끼의 하루")
                .orElseGet(() -> boardRepository.save(new Board(
                "토끼의 하루",
                "토끼가 숲에서 친구들을 만나는 이야기",
                "숲속 친구들과 보내는 따뜻한 하루",
                1
        )));

        Board secondBook = boardRepository.findByTitleAndDeletedDateIsNull("바다 여행")
                .orElseGet(() -> boardRepository.save(new Board(
                "바다 여행",
                "아이들이 바다로 여행을 떠나는 이야기",
                "파도와 모래사장에서 배우는 즐거움",
                1
        )));

        if (!contentRepository.existsByBoardIdAndSeq(firstBook.getId(), 1)) {
            contentRepository.save(new Content(
                    firstBook,
                    1,
                    "/images/rabbit-01.png",
                    "토끼가 아침에 일어났어요.",
                    "The rabbit woke up in the morning.",
                    "うさぎが朝起きました。",
                    "/audio/ko/rabbit-01.mp3",
                    "/audio/en/rabbit-01.mp3",
                    "/audio/jp/rabbit-01.mp3"
            ));
        }

        if (!contentRepository.existsByBoardIdAndSeq(firstBook.getId(), 2)) {
            contentRepository.save(new Content(
                    firstBook,
                    2,
                    "/images/rabbit-02.png",
                    "토끼는 친구를 만나러 숲으로 갔어요.",
                    "The rabbit went to the forest to meet a friend.",
                    "うさぎは友だちに会いに森へ行きました。",
                    "/audio/ko/rabbit-02.mp3",
                    "/audio/en/rabbit-02.mp3",
                    "/audio/jp/rabbit-02.mp3"
            ));
        }

        if (!contentRepository.existsByBoardIdAndSeq(secondBook.getId(), 1)) {
            contentRepository.save(new Content(
                    secondBook,
                    1,
                    "/images/sea-01.png",
                    "아이들이 푸른 바다에 도착했어요.",
                    "The children arrived at the blue sea.",
                    "子どもたちは青い海に着きました。",
                    "/audio/ko/sea-01.mp3",
                    "/audio/en/sea-01.mp3",
                    "/audio/jp/sea-01.mp3"
            ));
        }
    }
}
