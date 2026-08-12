package com.example.donghwanara.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class GeneratedMediaConfig implements WebMvcConfigurer {

    private final Path generatedMediaDir;

    public GeneratedMediaConfig(@Value("${story.generated-media-dir:generated-media}") String generatedMediaDir) {
        this.generatedMediaDir = Path.of(generatedMediaDir).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/generated/**")
                .addResourceLocations(generatedMediaDir.toUri().toString());
    }
}
