package com.airline.reservation.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class Dto {
  private Dto() {}
  public record GroupHoldRequest(@NotNull Long flightId, @NotEmpty @Size(max=6) List<@NotBlank String> seatNumbers, @NotNull @Size(max=6) List<@NotBlank String> releaseHoldIds) {}

  public record PageView<T>(List<T> content, int number, int totalPages, long totalElements) {
    public static <T> PageView<T> of(org.springframework.data.domain.Page<T> page) {
      return new PageView<>(
          page.getContent(), page.getNumber(), page.getTotalPages(), page.getTotalElements());
    }
  }

  public record Register(
      @NotBlank @Size(max = 80) String name,
      @Email @NotBlank @Size(max = 254) String email,
      @NotBlank @Size(min = 10, max = 72) String password) {}

  public record Login(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {}

  public record Refresh(@NotBlank String refreshToken) {}

  public record User(Long id, String name, String email, String role) {}

  public record Tokens(String accessToken, String refreshToken, User user) {}

  public record AirportView(String code, String city, String name) {}

  public record AircraftView(Long id, String type, String layout, int rows, int columnsCount) {}

  public record FlightView(
      Long id,
      String flightNumber,
      String origin,
      String destination,
      Instant departure,
      Instant arrival,
      BigDecimal basePrice,
      String status,
      AircraftView aircraft,
      String airline) {}

  public record FareView(String code, BigDecimal multiplier, String baggage) {}

  public record ExtraView(String code, String name, String kind, BigDecimal price) {}

  public record SeatView(
      Long id,
      String number,
      int row,
      int column,
      String cabin,
      List<String> features,
      BigDecimal price,
      String status,
      String holdId,
      Instant expiresAt,
      double x,
      double y,
      double z) {}

  public record SeatMap(FlightView flight, List<SeatView> seats) {}

  public record HoldRequest(@NotNull Long flightId, @NotBlank String seatNumber) {}

  public record HoldView(String id, String seatNumber, Instant expiresAt) {}

  public record PassengerInput(
      @NotBlank @Size(max = 80) String name,
      @NotNull @Past LocalDate dateOfBirth,
      @NotBlank String seatNumber,
      @NotBlank String holdId,
      @NotBlank String baggage,
      @NotBlank String meal) {}

  public record BookRequest(
      @NotNull Long flightId,
      @NotBlank @Pattern(regexp = "[a-zA-Z0-9-]{20,80}") String requestId,
      @NotBlank @Pattern(regexp = "APPROVE|DECLINE") String paymentOutcome,
      @NotEmpty @Size(max = 6) List<@Valid PassengerInput> passengers) {}

  public record PassengerView(
      String name, LocalDate dateOfBirth, String seatNumber, String baggage, String meal) {}

  public record BookingView(
      Long id,
      String pnr,
      String status,
      BigDecimal total,
      Instant createdAt,
      FlightView flight,
      List<PassengerView> passengers) {}

  public record FlightInput(
      @NotBlank @Size(max = 12) String flightNumber,
      @NotNull Long aircraftId,
      @NotBlank String origin,
      @NotBlank String destination,
      @NotNull @Future Instant departure,
      @NotNull @Future Instant arrival,
      @NotNull @DecimalMin("1.00") BigDecimal basePrice) {}

  public record SeatUpdate(boolean blocked, @NotNull @DecimalMin("0.00") BigDecimal surcharge) {}

  public record AircraftInput(
      @NotBlank @Size(max = 80) String type,
      @Pattern(regexp = "3-3|2-4-2") @NotBlank String layout,
      @Min(6) @Max(40) int rows) {}
}
