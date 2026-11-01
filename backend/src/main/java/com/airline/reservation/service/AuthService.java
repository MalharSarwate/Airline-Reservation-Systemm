package com.airline.reservation.service;

import com.airline.reservation.api.*;
import com.airline.reservation.domain.*;
import com.airline.reservation.repository.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
  private final UserAccountRepository users;
  private final RefreshTokenRepository refresh;
  private final PasswordEncoder passwords;
  private final JwtEncoder encoder;
  private final SecureRandom random = new SecureRandom();

  @Transactional
  public Dto.Tokens register(Dto.Register in) {
    String email = in.email().strip().toLowerCase(Locale.ROOT);
    if (users.findByEmail(email).isPresent())
      throw ApiException.conflict("Email is already registered");
    UserAccount u = new UserAccount();
    u.setName(in.name().strip());
    u.setEmail(email);
    u.setPasswordHash(passwords.encode(in.password()));
    u.setRole("USER");
    users.save(u);
    return tokens(u);
  }

  @Transactional
  public Dto.Tokens login(Dto.Login in) {
    UserAccount u =
        users.findByEmail(in.email().strip().toLowerCase(Locale.ROOT)).orElseThrow(this::invalid);
    if (!passwords.matches(in.password(), u.getPasswordHash())) throw invalid();
    return tokens(u);
  }

  @Transactional
  public Dto.Tokens renew(String raw) {
    RefreshToken t = refresh.locked(hash(raw)).orElseThrow(this::invalid);
    if (!t.getExpiresAt().isAfter(Instant.now())) throw invalid();
    UserAccount u = users.findById(t.getUserId()).orElseThrow(this::invalid);
    refresh.delete(t);
    refresh.flush();
    return tokens(u);
  }

  @Transactional
  public void logout(String raw) {
    refresh.findById(hash(raw)).ifPresent(refresh::delete);
  }

  public Dto.User user(Long id) {
    return view(users.findById(id).orElseThrow(this::invalid));
  }

  private ApiException invalid() {
    return new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials or expired session");
  }

  private Dto.User view(UserAccount u) {
    return new Dto.User(u.getId(), u.getName(), u.getEmail(), u.getRole());
  }

  private Dto.Tokens tokens(UserAccount u) {
    Instant now = Instant.now();
    var claims =
        JwtClaimsSet.builder()
            .issuer("airline-reservation")
            .subject(u.getId().toString())
            .issuedAt(now)
            .expiresAt(now.plusSeconds(900))
            .claim("role", u.getRole())
            .build();
    String access =
        encoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();
    byte[] bytes = new byte[48];
    random.nextBytes(bytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    RefreshToken t = new RefreshToken();
    t.setId(hash(raw));
    t.setUserId(u.getId());
    t.setExpiresAt(now.plus(Duration.ofDays(7)));
    refresh.save(t);
    return new Dto.Tokens(access, raw, view(u));
  }

  private String hash(String value) {
    try {
      return HexFormat.of()
          .formatHex(
              MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
