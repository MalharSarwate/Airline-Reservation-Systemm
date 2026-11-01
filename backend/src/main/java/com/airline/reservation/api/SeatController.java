package com.airline.reservation.api;

import com.airline.reservation.service.SeatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seats/hold")
@RequiredArgsConstructor
public class SeatController {
  private final SeatService seats;

  @PostMapping
  Dto.HoldView hold(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Dto.HoldRequest in) {
    return seats.hold(Long.valueOf(jwt.getSubject()), in);
  }

  @PostMapping("/group")
  java.util.List<Dto.HoldView> group(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Dto.GroupHoldRequest in) {
    return seats.holdGroup(Long.valueOf(jwt.getSubject()),in);
  }

  @DeleteMapping("/{id}")
  void release(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
    seats.release(Long.valueOf(jwt.getSubject()), id);
  }
}
