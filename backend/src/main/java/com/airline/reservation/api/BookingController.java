package com.airline.reservation.api;

import com.airline.reservation.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {
  private final BookingService bookings;
  private final TicketService tickets;

  @PostMapping
  Dto.BookingView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Dto.BookRequest in) {
    return bookings.book(Long.valueOf(jwt.getSubject()), in);
  }

  @GetMapping("/me")
  Dto.PageView<Dto.BookingView> mine(
      @AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "0") int page) {
    return Dto.PageView.of(bookings.mine(Long.valueOf(jwt.getSubject()), page));
  }

  @PostMapping("/{id}/cancel")
  Dto.BookingView cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    return bookings.cancel(Long.valueOf(jwt.getSubject()), id);
  }

  @GetMapping("/{id}/ticket")
  ResponseEntity<byte[]> ticket(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
    var b = bookings.get(Long.valueOf(jwt.getSubject()), id);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-" + b.pnr() + ".pdf")
        .body(tickets.pdf(b));
  }
}
