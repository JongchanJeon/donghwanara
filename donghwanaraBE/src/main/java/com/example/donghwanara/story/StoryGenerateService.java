package com.example.donghwanara.story;

import com.example.donghwanara.board.Board;
import com.example.donghwanara.board.BoardRepository;
import com.example.donghwanara.board.dto.BoardContentsCreateResponse;
import com.example.donghwanara.board.dto.BoardResponse;
import com.example.donghwanara.content.Content;
import com.example.donghwanara.content.ContentRepository;
import com.example.donghwanara.content.dto.ContentResponse;
import com.example.donghwanara.member.Member;
import com.example.donghwanara.member.MemberRepository;
import com.example.donghwanara.story.dto.StoryGenerateRequest;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class StoryGenerateService {

    private static final Logger log = LoggerFactory.getLogger(StoryGenerateService.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long IMAGE_RATE_LIMIT_WINDOW_MILLIS = 60_000L;

    private final BoardRepository boardRepository;
    private final ContentRepository contentRepository;
    private final MemberRepository memberRepository;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final TransactionTemplate transactionTemplate;
    private final String configuredApiKey;
    private final String storyModel;
    private final String imageModel;
    private final String ttsModel;
    private final String ttsVoice;
    private final Path generatedMediaDir;
    private final int assetConcurrency;
    private final ExecutorService backgroundExecutor;
    private final int imageRequestsPerMinute;
    private final Object imageRateLimitLock = new Object();
    private final Deque<Long> imageRequestStartedAt = new ArrayDeque<>();

    public StoryGenerateService(
            BoardRepository boardRepository,
            ContentRepository contentRepository,
            MemberRepository memberRepository,
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder,
            PlatformTransactionManager transactionManager,
            @Value("${openai.api-key:}") String apiKey,
            @Value("${openai.model:gpt-5.2}") String storyModel,
            @Value("${openai.image-model:gpt-image-1}") String imageModel,
            @Value("${openai.tts-model:gpt-4o-mini-tts}") String ttsModel,
            @Value("${openai.tts-voice:shimmer}") String ttsVoice,
            @Value("${openai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${story.generated-media-dir:generated-media}") String generatedMediaDir,
            @Value("${story.asset-concurrency:8}") int assetConcurrency,
            @Value("${story.background-concurrency:2}") int backgroundConcurrency,
            @Value("${story.image-requests-per-minute:5}") int imageRequestsPerMinute
    ) {
        this.boardRepository = boardRepository;
        this.contentRepository = contentRepository;
        this.memberRepository = memberRepository;
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.configuredApiKey = apiKey;
        this.storyModel = storyModel;
        this.imageModel = imageModel;
        this.ttsModel = ttsModel;
        this.ttsVoice = ttsVoice;
        this.generatedMediaDir = Path.of(generatedMediaDir).toAbsolutePath().normalize();
        this.assetConcurrency = Math.max(1, assetConcurrency);
        this.backgroundExecutor = Executors.newFixedThreadPool(Math.max(1, backgroundConcurrency));
        this.imageRequestsPerMinute = Math.max(1, imageRequestsPerMinute);
    }

    @PreDestroy
    public void shutdownExecutors() {
        backgroundExecutor.shutdown();
    }

    public BoardContentsCreateResponse generate(StoryGenerateRequest request, Member member) {
        log.info("Story generation started.");
        String apiKey = configuredApiKey();
        ensureStoryPointExists(member);

        OpenAiStoryDraft draft = createDraft(request, apiKey);
        log.info("Story content generated. title={}, pageCount={}", draft.title().ko(), draft.pages().size());

        String storyKey = UUID.randomUUID().toString();
        Path storyDir = generatedMediaDir.resolve(storyKey);

        writeStoryJson(storyDir, draft);
        log.info("Story JSON saved. storyKey={}, path={}", storyKey, storyDir.resolve("story.json"));

        SavedStory savedStory = transactionTemplate.execute(
                status -> saveGeneratedStoryWithPendingAssets(request, draft, storyKey, storyDir, member)
        );
        scheduleBackgroundAssetGeneration(storyKey, storyDir, draft, savedStory.targets(), apiKey);
        log.info("Story generation response returned. boardId={}, storyKey={}", savedStory.response().board().id(), storyKey);
        return savedStory.response();
    }

    private OpenAiStoryDraft createDraft(StoryGenerateRequest request, String apiKey) {
        try {
            log.info("OpenAI story content request started. model={}", storyModel);
            String outputText = retry("story content generation", () -> {
                JsonNode response = restClient.post()
                        .uri("/responses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(storyRequestBody(request))
                        .retrieve()
                        .body(JsonNode.class);
                return extractOutputText(response);
            });

            OpenAiStoryDraft draft = objectMapper.readValue(outputText, OpenAiStoryDraft.class);
            validateDraft(draft);
            log.info("OpenAI story content request finished.");
            return draft;
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "OpenAI response was not valid story JSON",
                    ex
            );
        }
    }

    private void scheduleBackgroundAssetGeneration(
            String storyKey,
            Path storyDir,
            OpenAiStoryDraft draft,
            List<PageGenerationTarget> targets,
            String apiKey
    ) {
        CompletableFuture.runAsync(
                () -> generateAndPersistAssetsInBackground(storyKey, storyDir, draft, targets, apiKey),
                backgroundExecutor
        ).exceptionally(ex -> {
            log.error("Background asset generation failed. storyKey={}, failure={}", storyKey, summarizeException(ex));
            return null;
        });
        log.info("Background asset generation scheduled. storyKey={}", storyKey);
    }

    private void generateAndPersistAssetsInBackground(
            String storyKey,
            Path storyDir,
            OpenAiStoryDraft draft,
            List<PageGenerationTarget> targets,
            String apiKey
    ) {
        List<OpenAiStoryPage> pages = draft.pages()
                .stream()
                .sorted(Comparator.comparing(OpenAiStoryPage::pageNumber))
                .toList();
        int workerCount = Math.min(assetConcurrency, pages.size() * 4);
        log.info(
                "Parallel page asset generation started. pageCount={}, workerCount={}",
                pages.size(),
                workerCount
        );

        ExecutorService executorService = Executors.newFixedThreadPool(workerCount);
        try {
            List<PageAssetFutures> futures = pages.stream()
                    .map(page -> submitPageAssetTasks(storyKey, storyDir, draft.mainCharacters(), page, executorService, apiKey))
                    .toList();

            Map<Integer, PageGenerationTarget> targetByPageNumber = new LinkedHashMap<>();
            for (PageGenerationTarget target : targets) {
                targetByPageNumber.put(target.pageNumber(), target);
            }

            for (PageAssetFutures future : futures) {
                GeneratedPageAssets assets = joinPageAssetFutures(future);
                PageGenerationTarget target = targetByPageNumber.get(assets.page().pageNumber());
                if (target == null) {
                    log.warn("Content target was not found for generated page. pageNumber={}", assets.page().pageNumber());
                    continue;
                }
                updateContentAssets(target.contentId(), assets);
            }
            log.info("Background page asset generation finished. storyKey={}, pageCount={}", storyKey, pages.size());
        } finally {
            executorService.shutdown();
        }
    }

    private PageAssetFutures submitPageAssetTasks(
            String storyKey,
            Path storyDir,
            List<OpenAiMainCharacter> mainCharacters,
            OpenAiStoryPage page,
            ExecutorService executorService,
            String apiKey
    ) {
        log.info("Page asset tasks submitted. pageNumber={}", page.pageNumber());
        return new PageAssetFutures(
                page,
                CompletableFuture.supplyAsync(() -> generateImage(storyKey, storyDir, mainCharacters, page, apiKey), executorService),
                CompletableFuture.supplyAsync(() -> generateSpeech(storyKey, storyDir, page, "ko", apiKey), executorService),
                CompletableFuture.supplyAsync(() -> generateSpeech(storyKey, storyDir, page, "en", apiKey), executorService),
                CompletableFuture.supplyAsync(() -> generateSpeech(storyKey, storyDir, page, "ja", apiKey), executorService)
        );
    }

    private GeneratedPageAssets joinPageAssetFutures(PageAssetFutures futures) {
        int pageNumber = futures.page().pageNumber();
        String imagePath = joinAssetFuture(futures.imagePath(), pageNumber, "image");
        String audioKoPath = joinAssetFuture(futures.audioKoPath(), pageNumber, "audio-ko");
        String audioEnPath = joinAssetFuture(futures.audioEnPath(), pageNumber, "audio-en");
        String audioJpPath = joinAssetFuture(futures.audioJpPath(), pageNumber, "audio-ja");
        log.info("Page asset generation finished. pageNumber={}", pageNumber);
        return new GeneratedPageAssets(futures.page(), imagePath, audioKoPath, audioEnPath, audioJpPath);
    }

    private String joinAssetFuture(CompletableFuture<String> future, int pageNumber, String assetType) {
        try {
            return future.join();
        } catch (CompletionException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Failed to generate " + assetType + " for page " + pageNumber,
                    ex.getCause() == null ? ex : ex.getCause()
            );
        }
    }

    private String generateImage(
            String storyKey,
            Path storyDir,
            List<OpenAiMainCharacter> mainCharacters,
            OpenAiStoryPage page,
            String apiKey
    ) {
        int pageNumber = page.pageNumber();
        try {
            log.info("OpenAI image request started. pageNumber={}, model={}", pageNumber, imageModel);
            String b64Image = retry("image generation page " + pageNumber, () -> {
                acquireImageRequestSlot(pageNumber);
                JsonNode response = restClient.post()
                        .uri("/images/generations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(imageRequestBody(mainCharacters, page))
                        .retrieve()
                        .body(JsonNode.class);
                return extractImageBase64(response);
            });

            Path imagePath = storyDir.resolve("images").resolve("page-%02d.png".formatted(pageNumber));
            Files.createDirectories(imagePath.getParent());
            Files.write(imagePath, Base64.getDecoder().decode(b64Image));
            log.info("OpenAI image saved. pageNumber={}, path={}", pageNumber, imagePath);
            return "/generated/%s/images/%s".formatted(storyKey, imagePath.getFileName());
        } catch (Exception ex) {
            log.warn("Image generation failed. pageNumber={}, failure={}", pageNumber, summarizeException(ex));
            return writeImageFallback(storyKey, storyDir, pageNumber);
        }
    }

    private String generateSpeech(
            String storyKey,
            Path storyDir,
            OpenAiStoryPage page,
            String languageCode,
            String apiKey
    ) {
        int pageNumber = page.pageNumber();
        try {
            log.info(
                    "OpenAI speech request started. pageNumber={}, languageCode={}, model={}",
                    pageNumber,
                    languageCode,
                    ttsModel
            );
            byte[] audio = retry("speech generation page " + pageNumber + " language " + languageCode, () ->
                    restClient.post()
                            .uri("/audio/speech")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(speechRequestBody(page, languageCode))
                            .retrieve()
                            .body(byte[].class)
            );

            Path audioPath = storyDir.resolve("audio")
                    .resolve(languageCode)
                    .resolve("page-%02d.mp3".formatted(pageNumber));
            Files.createDirectories(audioPath.getParent());
            Files.write(audioPath, audio);
            log.info(
                    "OpenAI speech saved. pageNumber={}, languageCode={}, path={}",
                    pageNumber,
                    languageCode,
                    audioPath
            );
            return "/generated/%s/audio/%s/%s".formatted(storyKey, languageCode, audioPath.getFileName());
        } catch (Exception ex) {
            log.warn("Speech generation failed. pageNumber={}, languageCode={}", pageNumber, languageCode, ex);
            return "/generated/%s/audio/%s/page-%02d-unavailable.mp3".formatted(storyKey, languageCode, pageNumber);
        }
    }

    private SavedStory saveGeneratedStoryWithPendingAssets(
            StoryGenerateRequest request,
            OpenAiStoryDraft draft,
            String storyKey,
            Path storyDir,
            Member member
    ) {
        log.info("Saving generated story placeholders to database. pageCount={}", draft.pages().size());
        Member managedMember = memberRepository.findByIdAndDeletedDateIsNull(member.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
        if (!managedMember.hasStoryPoint()) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "동화 포인트가 없습니다. 관리자에게 문의해 주세요."
            );
        }
        managedMember.consumeStoryPoint();

        Board board = boardRepository.save(new Board(
                limit(firstNonBlank(draft.title().ko(), request.title(), autoTitle(request.prompt())), 50),
                limit(request.prompt(), 256),
                limit(firstNonBlank(firstPageText(draft), request.prompt()), 256),
                1,
                managedMember
        ));

        List<Content> contents = new ArrayList<>();
        for (OpenAiStoryPage page : draft.pages().stream().sorted(Comparator.comparing(OpenAiStoryPage::pageNumber)).toList()) {
            int pageNumber = page.pageNumber();
            contents.add(new Content(
                    board,
                    pageNumber,
                    writePendingImage(storyKey, storyDir, pageNumber),
                    limit(page.text().ko(), 1000),
                    limit(page.text().en(), 1000),
                    limit(page.text().ja(), 1000),
                    limit(page.sceneDescription().ko(), 1000),
                    limit(page.sceneDescription().en(), 1000),
                    limit(page.sceneDescription().ja(), 1000),
                    pendingAudioPath(storyKey, pageNumber, "ko"),
                    pendingAudioPath(storyKey, pageNumber, "en"),
                    pendingAudioPath(storyKey, pageNumber, "ja")
            ));
        }

        List<Content> savedContents = contentRepository.saveAll(contents);
        List<ContentResponse> contentResponses = savedContents
                .stream()
                .map(ContentResponse::from)
                .toList();
        List<PageGenerationTarget> targets = savedContents
                .stream()
                .map(content -> new PageGenerationTarget(content.getId(), content.getSeq()))
                .toList();

        log.info("Generated story placeholders saved. boardId={}, contentCount={}", board.getId(), contentResponses.size());
        return new SavedStory(new BoardContentsCreateResponse(BoardResponse.from(board), contentResponses), targets);
    }

    private void updateContentAssets(Integer contentId, GeneratedPageAssets assets) {
        transactionTemplate.executeWithoutResult(status -> {
            Content content = contentRepository.findById(contentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Content not found"));
            content.update(
                    content.getSeq(),
                    assets.imagePath(),
                    content.getSubtitleKo(),
                    content.getSubtitleEn(),
                    content.getSubtitleJp(),
                    content.getSceneDescriptionKo(),
                    content.getSceneDescriptionEn(),
                    content.getSceneDescriptionJp(),
                    assets.audioKoPath(),
                    assets.audioEnPath(),
                    assets.audioJpPath()
            );
            contentRepository.save(content);
        });
        log.info(
                "Generated page assets persisted. contentId={}, pageNumber={}",
                contentId,
                assets.page().pageNumber()
        );
    }

    private String writePendingImage(String storyKey, Path storyDir, int pageNumber) {
        try {
            Path pendingPath = storyDir.resolve("images").resolve("page-%02d-pending.svg".formatted(pageNumber));
            Files.createDirectories(pendingPath.getParent());
            Files.writeString(pendingPath, """
                    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                      <rect width="1024" height="1024" fill="#f8eadf"/>
                      <circle cx="512" cy="430" r="170" fill="#f5c7b8"/>
                      <text x="512" y="650" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#7a5b4f">Generating image...</text>
                    </svg>
                    """);
            return "/generated/%s/images/%s".formatted(storyKey, pendingPath.getFileName());
        } catch (IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save pending image for page " + pageNumber,
                    ex
            );
        }
    }

    private String pendingAudioPath(String storyKey, int pageNumber, String languageCode) {
        return "/generated/%s/audio/%s/page-%02d-pending.mp3".formatted(storyKey, languageCode, pageNumber);
    }

    private Map<String, Object> storyRequestBody(StoryGenerateRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", storyModel);
        body.put("instructions", """
                You create safe, warm, age-appropriate children's storybooks.
                Return only JSON that matches the provided schema.
                Create 5 to 8 pages.
                Every page must include pageNumber, text, and sceneDescription.
                The story must follow this structure across the pages: beginning, development, conflict, resolution, ending.
                The final page must feel like a complete fairy-tale ending.
                It should gently close the story with warmth, reassurance, and a sense that the adventure has come to a peaceful end.
                Do not end the story abruptly.
                The last page should include a calm closing scene, emotional resolution, and a final sentence that sounds like the end of a children's storybook.
                Support Korean, English, and Japanese in every localized field.
                Keep page text gentle, clear, and suitable for children aged 3 to 8.
                Avoid scary, violent, horror, dark, disturbing, unsafe, or adult themes.
                Keep character designs specific and consistent so image prompts can reuse them.
                """);
        body.put("input", """
                User title hint: %s
                Hero name hint: %s
                Story request: %s
                """.formatted(
                blankToDefault(request.title(), "not provided"),
                blankToDefault(request.heroName(), "not provided"),
                request.prompt()
        ));
        body.put("max_output_tokens", 5000);
        body.put("text", Map.of("format", storyJsonSchemaFormat()));
        return body;
    }

    private Map<String, Object> imageRequestBody(
            List<OpenAiMainCharacter> mainCharacters,
            OpenAiStoryPage page
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", imageModel);
        body.put("prompt", """
                Create a warm and charming children's storybook illustration.
                Use soft pastel colors, gentle lighting, cute and friendly characters, cozy atmosphere, and consistent character design.
                The illustration must be suitable for children aged 3 to 8.
                Do not include scary, violent, horror, dark, or disturbing elements.
                Use the character descriptions and the page scene description below.

                Character descriptions:
                %s

                Scene:
                %s
                """.formatted(characterDescriptions(mainCharacters), page.sceneDescription().en()));
        body.put("size", "1024x1024");
        body.put("n", 1);
        return body;
    }

    private Map<String, Object> speechRequestBody(OpenAiStoryPage page, String languageCode) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", ttsModel);
        body.put("voice", ttsVoice);
        body.put("input", page.text().value(languageCode));
        body.put("instructions", """
                Read the following children's storybook page in a warm, gentle, and expressive storytelling voice.
                Use clear pronunciation, calm tone, slightly slow reading speed, and natural rhythm.
                Do not use scary, dramatic, or exaggerated acting.

                Language:
                %s
                """.formatted(languageCode));
        body.put("response_format", "mp3");
        return body;
    }

    private Map<String, Object> storyJsonSchemaFormat() {
        Map<String, Object> localizedTextSchema = localizedTextSchema();
        Map<String, Object> characterSchema = objectSchema(
                List.of("name", "description"),
                Map.of(
                        "name", localizedTextSchema,
                        "description", localizedTextSchema
                )
        );
        Map<String, Object> pageSchema = objectSchema(
                List.of("pageNumber", "text", "sceneDescription"),
                Map.of(
                        "pageNumber", Map.of("type", "integer"),
                        "text", localizedTextSchema,
                        "sceneDescription", localizedTextSchema
                )
        );
        Map<String, Object> schema = objectSchema(
                List.of("title", "mainCharacters", "pages"),
                Map.of(
                        "title", localizedTextSchema,
                        "mainCharacters", Map.of("type", "array", "items", characterSchema),
                        "pages", Map.of("type", "array", "items", pageSchema)
                )
        );

        Map<String, Object> format = new LinkedHashMap<>();
        format.put("type", "json_schema");
        format.put("name", "storybook_generation");
        format.put("strict", true);
        format.put("schema", schema);
        return format;
    }

    private Map<String, Object> localizedTextSchema() {
        return objectSchema(
                List.of("ko", "en", "ja"),
                Map.of(
                        "ko", Map.of("type", "string"),
                        "en", Map.of("type", "string"),
                        "ja", Map.of("type", "string")
                )
        );
    }

    private Map<String, Object> objectSchema(List<String> required, Map<String, Object> properties) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        schema.put("required", required);
        schema.put("properties", properties);
        return schema;
    }

    private String extractOutputText(JsonNode response) {
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI response was empty");
        }
        if (response.hasNonNull("output_text")) {
            return response.get("output_text").asText();
        }

        StringBuilder outputText = new StringBuilder();
        JsonNode output = response.path("output");
        if (output.isArray()) {
            for (JsonNode outputItem : output) {
                JsonNode content = outputItem.path("content");
                if (!content.isArray()) continue;

                for (JsonNode contentItem : content) {
                    String type = contentItem.path("type").asText();
                    if ("output_text".equals(type) || contentItem.has("text")) {
                        outputText.append(contentItem.path("text").asText());
                    }
                }
            }
        }

        if (!StringUtils.hasText(outputText)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI response had no output text");
        }

        return outputText.toString();
    }

    private String extractImageBase64(JsonNode response) {
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI image response was empty");
        }
        JsonNode data = response.path("data");
        if (!data.isArray() || data.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI image response had no data");
        }
        String b64Json = data.get(0).path("b64_json").asText();
        if (!StringUtils.hasText(b64Json)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI image response had no b64_json");
        }
        return b64Json;
    }

    private void validateDraft(OpenAiStoryDraft draft) {
        if (draft == null || draft.title() == null || draft.mainCharacters() == null || draft.pages() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI story draft was incomplete");
        }
        validateLocalizedText(draft.title(), "title");
        if (draft.mainCharacters().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI story draft must include mainCharacters");
        }
        for (OpenAiMainCharacter character : draft.mainCharacters()) {
            if (character == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI story draft had an empty character");
            }
            validateLocalizedText(character.name(), "mainCharacters.name");
            validateLocalizedText(character.description(), "mainCharacters.description");
        }
        if (draft.pages().size() < 5 || draft.pages().size() > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI story draft must have 5 to 8 pages");
        }
        for (int i = 0; i < draft.pages().size(); i++) {
            OpenAiStoryPage page = draft.pages().get(i);
            int expectedPageNumber = i + 1;
            if (page == null || page.pageNumber() == null || page.pageNumber() != expectedPageNumber) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "OpenAI story pages must be sequential from 1"
                );
            }
            validateLocalizedText(page.text(), "pages.text");
            validateLocalizedText(page.sceneDescription(), "pages.sceneDescription");
        }
    }

    private void validateLocalizedText(LocalizedText localizedText, String fieldName) {
        if (localizedText == null
                || !StringUtils.hasText(localizedText.ko())
                || !StringUtils.hasText(localizedText.en())
                || !StringUtils.hasText(localizedText.ja())) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI story draft missing " + fieldName);
        }
    }

    private void writeStoryJson(Path storyDir, OpenAiStoryDraft draft) {
        try {
            Files.createDirectories(storyDir);
            objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValue(storyDir.resolve("story.json").toFile(), draft);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save story JSON", ex);
        }
    }

    private String writeImageFallback(String storyKey, Path storyDir, int pageNumber) {
        try {
            Path fallbackPath = storyDir.resolve("images").resolve("page-%02d-unavailable.svg".formatted(pageNumber));
            Files.createDirectories(fallbackPath.getParent());
            Files.writeString(fallbackPath, """
                    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
                      <rect width="1024" height="1024" fill="#f8eadf"/>
                      <circle cx="512" cy="430" r="170" fill="#f5c7b8"/>
                      <text x="512" y="660" text-anchor="middle" font-family="sans-serif" font-size="44" fill="#7a5b4f">Image unavailable</text>
                    </svg>
                    """);
            return "/generated/%s/images/%s".formatted(storyKey, fallbackPath.getFileName());
        } catch (IOException fallbackException) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to save image fallback for page " + pageNumber,
                    fallbackException
            );
        }
    }

    private String characterDescriptions(List<OpenAiMainCharacter> mainCharacters) {
        List<String> descriptions = mainCharacters.stream()
                .map(character -> "- %s: %s".formatted(character.name().en(), character.description().en()))
                .toList();
        return String.join("\n", descriptions);
    }

    private void acquireImageRequestSlot(int pageNumber) {
        while (true) {
            long waitMillis;
            synchronized (imageRateLimitLock) {
                long now = System.currentTimeMillis();
                while (!imageRequestStartedAt.isEmpty()
                        && now - imageRequestStartedAt.peekFirst() >= IMAGE_RATE_LIMIT_WINDOW_MILLIS) {
                    imageRequestStartedAt.removeFirst();
                }

                if (imageRequestStartedAt.size() < imageRequestsPerMinute) {
                    imageRequestStartedAt.addLast(now);
                    return;
                }

                waitMillis = imageRequestStartedAt.peekFirst() + IMAGE_RATE_LIMIT_WINDOW_MILLIS - now + 250L;
            }

            log.info(
                    "Waiting for image rate limit. pageNumber={}, waitMs={}, limitPerMinute={}",
                    pageNumber,
                    waitMillis,
                    imageRequestsPerMinute
            );
            sleepMillis(waitMillis);
        }
    }

    private <T> T retry(String operationName, RetryableOperation<T> operation) {
        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            long retryDelayMillis = 500L * attempt;
            try {
                return operation.run();
            } catch (RestClientResponseException ex) {
                retryDelayMillis = retryDelayMillis(ex, attempt);
                lastException = new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "OpenAI API request failed: " + ex.getResponseBodyAsString(),
                        ex
                );
            } catch (ResponseStatusException ex) {
                lastException = ex;
            } catch (RuntimeException ex) {
                lastException = ex;
            }

            if (attempt < MAX_RETRY_ATTEMPTS) {
                log.warn(
                        "Retrying OpenAI operation. operation={}, attempt={}, waitMs={}, failure={}",
                        operationName,
                        attempt + 1,
                        retryDelayMillis,
                        summarizeException(lastException)
                );
                sleepMillis(retryDelayMillis);
            }
        }
        throw lastException;
    }

    private long retryDelayMillis(RestClientResponseException ex, int attempt) {
        if (ex.getStatusCode().value() == 429) {
            String retryAfter = ex.getResponseHeaders() == null ? null : ex.getResponseHeaders().getFirst("Retry-After");
            if (StringUtils.hasText(retryAfter)) {
                try {
                    return Math.max(1L, Long.parseLong(retryAfter.trim())) * 1000L + 250L;
                } catch (NumberFormatException ignored) {
                    log.debug("Retry-After header was not numeric. value={}", retryAfter);
                }
            }
            return 12_250L;
        }
        return 500L * attempt;
    }

    private String summarizeException(Throwable throwable) {
        if (throwable == null) {
            return "unknown";
        }
        String message = throwable.getMessage();
        return throwable.getClass().getSimpleName() + (StringUtils.hasText(message) ? ": " + message : "");
    }

    private void sleepMillis(long millis) {
        try {
            Thread.sleep(Math.max(1L, millis));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "OpenAI retry was interrupted", ex);
        }
    }

    private String configuredApiKey() {
        if (StringUtils.hasText(configuredApiKey)) {
            return configuredApiKey.trim();
        }
        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OpenAI API key is not configured. Set openai.api-key in application.yaml"
        );
    }

    private void ensureStoryPointExists(Member member) {
        Member currentMember = memberRepository.findByIdAndDeletedDateIsNull(member.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login required"));
        if (!currentMember.hasStoryPoint()) {
            throw new ResponseStatusException(
                    HttpStatus.PAYMENT_REQUIRED,
                    "동화 포인트가 없습니다. 관리자에게 문의해 주세요."
            );
        }
    }

    private String firstPageText(OpenAiStoryDraft draft) {
        if (draft.pages().isEmpty() || draft.pages().get(0).text() == null) {
            return "";
        }
        return draft.pages().get(0).text().ko();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) return value.trim();
        }
        return "";
    }

    private String blankToDefault(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value.trim() : defaultValue;
    }

    private String autoTitle(String prompt) {
        String compact = prompt.trim().replaceAll("\\s+", " ");
        return compact.length() > 18 ? compact.substring(0, 18) + "..." : compact;
    }

    private String limit(String value, int maxLength) {
        if (value == null) return "";
        String trimmed = value.trim();
        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }

    @FunctionalInterface
    private interface RetryableOperation<T> {
        T run();
    }

    private record GeneratedPageAssets(
            OpenAiStoryPage page,
            String imagePath,
            String audioKoPath,
            String audioEnPath,
            String audioJpPath
    ) {
    }

    private record SavedStory(
            BoardContentsCreateResponse response,
            List<PageGenerationTarget> targets
    ) {
    }

    private record PageGenerationTarget(
            Integer contentId,
            Integer pageNumber
    ) {
    }

    private record PageAssetFutures(
            OpenAiStoryPage page,
            CompletableFuture<String> imagePath,
            CompletableFuture<String> audioKoPath,
            CompletableFuture<String> audioEnPath,
            CompletableFuture<String> audioJpPath
    ) {
    }

    private record OpenAiStoryDraft(
            LocalizedText title,
            List<OpenAiMainCharacter> mainCharacters,
            List<OpenAiStoryPage> pages
    ) {
    }

    private record OpenAiMainCharacter(
            LocalizedText name,
            LocalizedText description
    ) {
    }

    private record OpenAiStoryPage(
            Integer pageNumber,
            LocalizedText text,
            LocalizedText sceneDescription
    ) {
    }

    private record LocalizedText(
            String ko,
            String en,
            String ja
    ) {
        private String value(String languageCode) {
            return switch (languageCode) {
                case "ko" -> ko;
                case "en" -> en;
                case "ja" -> ja;
                default -> throw new IllegalArgumentException("Unsupported languageCode: " + languageCode);
            };
        }
    }
}
