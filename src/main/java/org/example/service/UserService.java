package org.example.service;

import jakarta.transaction.Transactional;
import org.example.models.dto.UserDTO;
import org.example.models.entity.ApplicationUser;
import org.example.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }



    @Transactional
    public ApplicationUser update(String id, UserDTO request) {
        ApplicationUser applicationUser = getRequiredUser(id);
        applicationUser.setName(request.name());
        return userRepository.save(applicationUser);
    }

    @Transactional
    public void delete(String id) {
        ApplicationUser applicationUser = getRequiredUser(id);
        userRepository.deleteByUserUid(applicationUser.getUserUid());
    }


    @Transactional
    public void deleteWithPassword(String email, String password) {
        ApplicationUser applicationUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }

        if (!passwordEncoder.matches(password, applicationUser.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password");
        }

        userRepository.deleteByUserUid(applicationUser.getUserUid());
    }


    private ApplicationUser getRequiredUser(String id) {
        return userRepository.findByUserUid(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

}

