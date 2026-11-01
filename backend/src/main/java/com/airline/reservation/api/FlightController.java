package com.airline.reservation.api;

import com.airline.reservation.service.*;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FlightController {
  private final FlightService flights;
  private final SeatService seats;
  private final SeatEvents events;

  @GetMapping("/airports")
  List<Dto.AirportView> airports() {
    return flights.airports();
  }

  @GetMapping("/fares")
  List<Dto.FareView> fares() {
    return flights.fares();
  }

  @GetMapping("/extras")
  List<Dto.ExtraView> extras() {
    return flights.extras();
  }

  @GetMapping("/flights/search")
  Dto.PageView<Dto.FlightView> search(
      @RequestParam(defaultValue = "") String origin,
      @RequestParam(defaultValue = "") String destination,
      @RequestParam LocalDate date,
      @RequestParam(defaultValue = "1") int passengers,
      @RequestParam(defaultValue = "ECONOMY") String cabin,
      @RequestParam(defaultValue = "price") String sort,
      @RequestParam(defaultValue = "0") int page) {
    return Dto.PageView.of(
        flights.search(origin, destination, date, passengers, cabin, sort, page));
  }

  @GetMapping("/flights/{id}")
  Dto.FlightView get(@PathVariable Long id) {
    return flights.get(id);
  }

  @GetMapping("/flights/{id}/seatmap")
  Dto.SeatMap map(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
    return seats.map(id, jwt == null ? null : Long.valueOf(jwt.getSubject()));
  }

  @GetMapping(value = "/flights/{id}/events", produces = "text/event-stream")
  SseEmitter events(@PathVariable Long id) {
    flights.get(id);
    return events.subscribe(id);
  }
}
