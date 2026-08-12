package com.example.donghwanara.content;

import com.example.donghwanara.board.Board;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "contents")
public class Content {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "book_id", nullable = false)
    private Board board;

    @Column(nullable = false)
    private Integer seq;

    @Column(name = "photo_path", nullable = false, length = 256)
    private String photoPath;

    @Column(name = "subtitle_ko", nullable = false, length = 1000)
    private String subtitleKo;

    @Column(name = "subtitle_en", nullable = false, length = 1000)
    private String subtitleEn;

    @Column(name = "subtitle_jp", nullable = false, length = 1000)
    private String subtitleJp;

    @Column(name = "scene_description_ko", length = 1000)
    private String sceneDescriptionKo;

    @Column(name = "scene_description_en", length = 1000)
    private String sceneDescriptionEn;

    @Column(name = "scene_description_jp", length = 1000)
    private String sceneDescriptionJp;

    @Column(name = "audio_ko_path", nullable = false, length = 256)
    private String audioKoPath;

    @Column(name = "audio_en_path", nullable = false, length = 256)
    private String audioEnPath;

    @Column(name = "audio_jp_path", nullable = false, length = 256)
    private String audioJpPath;

    public Content(
            Board board,
            Integer seq,
            String photoPath,
            String subtitleKo,
            String subtitleEn,
            String subtitleJp,
            String audioKoPath,
            String audioEnPath,
            String audioJpPath
    ) {
        this(
                board,
                seq,
                photoPath,
                subtitleKo,
                subtitleEn,
                subtitleJp,
                null,
                null,
                null,
                audioKoPath,
                audioEnPath,
                audioJpPath
        );
    }

    public Content(
            Board board,
            Integer seq,
            String photoPath,
            String subtitleKo,
            String subtitleEn,
            String subtitleJp,
            String sceneDescriptionKo,
            String sceneDescriptionEn,
            String sceneDescriptionJp,
            String audioKoPath,
            String audioEnPath,
            String audioJpPath
    ) {
        this.board = board;
        this.seq = seq;
        this.photoPath = photoPath;
        this.subtitleKo = subtitleKo;
        this.subtitleEn = subtitleEn;
        this.subtitleJp = subtitleJp;
        this.sceneDescriptionKo = sceneDescriptionKo;
        this.sceneDescriptionEn = sceneDescriptionEn;
        this.sceneDescriptionJp = sceneDescriptionJp;
        this.audioKoPath = audioKoPath;
        this.audioEnPath = audioEnPath;
        this.audioJpPath = audioJpPath;
    }

    public void update(
            Integer seq,
            String photoPath,
            String subtitleKo,
            String subtitleEn,
            String subtitleJp,
            String audioKoPath,
            String audioEnPath,
            String audioJpPath
    ) {
        update(
                seq,
                photoPath,
                subtitleKo,
                subtitleEn,
                subtitleJp,
                sceneDescriptionKo,
                sceneDescriptionEn,
                sceneDescriptionJp,
                audioKoPath,
                audioEnPath,
                audioJpPath
        );
    }

    public void update(
            Integer seq,
            String photoPath,
            String subtitleKo,
            String subtitleEn,
            String subtitleJp,
            String sceneDescriptionKo,
            String sceneDescriptionEn,
            String sceneDescriptionJp,
            String audioKoPath,
            String audioEnPath,
            String audioJpPath
    ) {
        this.seq = seq;
        this.photoPath = photoPath;
        this.subtitleKo = subtitleKo;
        this.subtitleEn = subtitleEn;
        this.subtitleJp = subtitleJp;
        this.sceneDescriptionKo = sceneDescriptionKo;
        this.sceneDescriptionEn = sceneDescriptionEn;
        this.sceneDescriptionJp = sceneDescriptionJp;
        this.audioKoPath = audioKoPath;
        this.audioEnPath = audioEnPath;
        this.audioJpPath = audioJpPath;
    }
}
