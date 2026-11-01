package com.airline.reservation.api;

import com.airline.reservation.service.AdminService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
  private final AdminService admin;

  public record Price(BigDecimal basePrice) {}

  @GetMapping("/aircraft")
  List<Dto.AircraftView> aircraft() {
    return admin.aircraft();
  }

  @PostMapping("/aircraft")
  Dto.AircraftView aircraft(@Valid @RequestBody Dto.AircraftInput in) {
    return admin.addAircraft(in);
  }

  @PostMapping("/flights")
  Dto.FlightView create(@Valid @RequestBody Dto.FlightInput in) {
    return admin.create(in);
  }

  @PatchMapping("/flights/{id}/price")
  Dto.FlightView price(@PathVariable Long id, @RequestBody Price price) {
    return admin.price(id, price.basePrice());
  }

  @PostMapping("/flights/{id}/cancel")
  Dto.FlightView cancel(@PathVariable Long id) {
    return admin.cancel(id);
  }

  @PatchMapping("/flights/{id}/seats/{number}")
  void seat(
      @PathVariable Long id, @PathVariable String number, @Valid @RequestBody Dto.SeatUpdate in) {
    admin.seat(id, number, in);
  }

  @GetMapping("/bookings")
  Dto.PageView<Dto.BookingView> bookings(@RequestParam(defaultValue = "0") int page) {
    return Dto.PageView.of(admin.bookings(page));
  }
}
