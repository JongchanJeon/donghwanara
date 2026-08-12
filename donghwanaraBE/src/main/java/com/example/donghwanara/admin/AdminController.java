package com.example.donghwanara.admin;

import com.example.donghwanara.admin.dto.StoryPointGrantRequest;
import com.example.donghwanara.auth.dto.UserResponse;
import com.example.donghwanara.member.Member;
import com.example.donghwanara.member.MemberRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {

    private final MemberRepository memberRepository;

    @Value("${admin.api-key:demo-admin}")
    private String adminApiKey;

    @PostMapping("/members/{memberId}/story-points")
    @Transactional
    public UserResponse grantStoryPoints(
            @PathVariable Integer memberId,
            @RequestHeader(name = "X-Admin-Key", required = false) String requestAdminKey,
            @Valid @RequestBody StoryPointGrantRequest request
    ) {
        if (!StringUtils.hasText(requestAdminKey) || !requestAdminKey.equals(adminApiKey)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid admin key");
        }

        Member member = memberRepository.findByIdAndDeletedDateIsNull(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
        member.addStoryPoints(request.amount());
        return UserResponse.from(member);
    }
}
