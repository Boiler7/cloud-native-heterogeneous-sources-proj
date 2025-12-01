package org.example.repository;

import org.example.models.entity.ApplicationUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<ApplicationUser, Long> {
    Optional<ApplicationUser> findByUserUid(String id);
    void deleteByUserUid(String id);

    ApplicationUser findUserByEmail(String email);

    Optional<ApplicationUser> findByEmail(String email);
}