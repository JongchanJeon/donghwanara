package com.example.donghwanara.member;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Integer> {

    boolean existsByEmailAndDeletedDateIsNull(String email);

    Optional<Member> findByEmailAndDeletedDateIsNull(String email);

    Optional<Member> findByIdAndDeletedDateIsNull(Integer id);
}
