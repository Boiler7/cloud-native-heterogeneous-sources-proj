package org.example.repository;

import org.example.models.entity.Dataset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DatasetRepository extends JpaRepository<Dataset, Long> {

    List<Dataset> findAllByApplicationUser_Id(Long userId);

    List<Dataset> findAllByApplicationUser_Email(String email);

    Optional<Dataset> findByNameIgnoreCase(String name);

    Optional<Dataset> findByNameIgnoreCaseAndApplicationUser_Id(String name, Long userId);

    Optional<Dataset> findByNameIgnoreCaseAndApplicationUser_Email(String name, String email);

    Optional<Dataset> findByIdAndApplicationUser_Id(Long id, Long userId);

    Optional<Dataset> findByIdAndApplicationUser_Email(Long id, String email);
}
