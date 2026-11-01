package com.airline.reservation.api;

import com.airline.reservation.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
  private final AuthService service;

  @PostMapping("/auth/register")
  Dto.Tokens register(@Valid @RequestBody Dto.Register in) {
    return service.register(in);
  }

  @PostMapping("/auth/login")
  Dto.Tokens login(@Valid @RequestBody Dto.Login in) {
    return service.login(in);
  }

  @PostMapping("/auth/refresh")
  Dto.Tokens refresh(@Valid @RequestBody Dto.Refresh in) {
    return service.renew(in.refreshToken());
  }

  @PostMapping("/auth/logout")
  void logout(@Valid @RequestBody Dto.Refresh in) {
    service.logout(in.refreshToken());
  }

  @GetMapping("/users/me")
  Dto.User me(@AuthenticationPrincipal Jwt jwt) {
    return service.user(Long.valueOf(jwt.getSubject()));
  }
}
