package com.airline.reservation.service;

import com.airline.reservation.api.*;
import com.airline.reservation.domain.*;
import com.airline.reservation.repository.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BookingService {
  private final BookingRepository bookings;
  private final FlightSeatRepository seats;
  private final PassengerRepository passengers;
  private final BookingSeatRepository bookingSeats;
  private final PaymentRepository payments;
  private final ExtraRepository extras;
  private final FlightService flights;
  private final SeatService seatService;
  private final SeatEvents events;

  @Transactional
  public Dto.BookingView book(Long user, Dto.BookRequest in) {
    var prior = bookings.findByRequestId(in.requestId());
    if (prior.isPresent()) {
      if (!prior.get().getUserId().equals(user))
        throw ApiException.conflict("Request key is already used");
      return view(prior.get());
    }
    Flight f = flights.requireForUpdate(in.flightId());
    flights.bookable(f);
    var retried = bookings.findByRequestId(in.requestId());
    if (retried.isPresent()) {
      if (!retried.get().getUserId().equals(user))
        throw ApiException.conflict("Request key is already used");
      return view(retried.get());
    }
    if (in.passengers().stream().map(Dto.PassengerInput::seatNumber).distinct().count()
        != in.passengers().size()) throw ApiException.bad("Each passenger needs a different seat");
    BigDecimal total = BigDecimal.ZERO;
    List<FlightSeat> selected = new ArrayList<>();
    for (var p : in.passengers()) {
      FlightSeat s =
          seats
              .findByFlightIdAndSeatNumber(f.getId(), p.seatNumber())
              .orElseThrow(ApiException::missing);
      if (s.isBlocked()
          || s.getBookingId() != null
          || !Objects.equals(s.getHoldUserId(), user)
          || !Objects.equals(s.getHoldId(), p.holdId())
          || s.getHoldExpiresAt() == null
          || !s.getHoldExpiresAt().isAfter(Instant.now()))
        throw ApiException.conflict("A seat hold expired or changed. Select your seats again.");
      if (s.getFeatures().contains("EXIT_ROW")
          && p.dateOfBirth().isAfter(LocalDate.now(ZoneOffset.UTC).minusYears(16)))
        throw ApiException.bad("Exit-row passengers must be at least 16 years old");
      if (p.dateOfBirth().isBefore(LocalDate.now(ZoneOffset.UTC).minusYears(120)))
        throw ApiException.bad("Check passenger date of birth");
      total =
          total
              .add(seatService.price(s, f))
              .add(extra(p.baggage(), "BAGGAGE"))
              .add(extra(p.meal(), "MEAL"));
      selected.add(s);
    }
    if ("DECLINE".equals(in.paymentOutcome()))
      throw new ApiException(
          org.springframework.http.HttpStatus.PAYMENT_REQUIRED,
          "Mock payment declined. Your holds remain available until expiry.");
    Booking b = new Booking();
    b.setUserId(user);
    b.setFlightId(f.getId());
    b.setPnr(
        UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT));
    b.setStatus("CONFIRMED");
    b.setTotal(total);
    b.setCreatedAt(Instant.now());
    b.setRequestId(in.requestId());
    bookings.saveAndFlush(b);
    for (int i = 0; i < selected.size(); i++) {
      FlightSeat s = selected.get(i);
      s.setBookingId(b.getId());
      seatService.clear(s);
      var inP = in.passengers().get(i);
      Passenger p = new Passenger();
      p.setBookingId(b.getId());
      p.setName(inP.name().strip());
      p.setDateOfBirth(inP.dateOfBirth());
      p.setSeatNumber(s.getSeatNumber());
      p.setBaggage(inP.baggage());
      p.setMeal(inP.meal());
      passengers.save(p);
      BookingSeat bs = new BookingSeat();
      bs.setBookingId(b.getId());
      bs.setFlightId(f.getId());
      bs.setSeatNumber(s.getSeatNumber());
      bs.setActive(true);
      bookingSeats.save(bs);
    }
    seats.flush();
    Payment pay = new Payment();
    pay.setBookingId(b.getId());
    pay.setAmount(total);
    pay.setStatus("MOCK_PAID");
    pay.setReference("MOCK-" + b.getPnr());
    payments.save(pay);
    events.changed(f.getId());
    return view(b);
  }

  private BigDecimal extra(String code, String kind) {
    Extra e = extras.findById(code).orElseThrow(() -> ApiException.bad("Invalid extra"));
    if (!e.getKind().equals(kind)) throw ApiException.bad("Invalid extra category");
    return e.getPrice();
  }

  @Transactional(readOnly = true)
  public Page<Dto.BookingView> mine(Long user, int page) {
    if (page < 0) throw ApiException.bad("Invalid page");
    return bookings
        .findByUserIdOrderByCreatedAtDesc(user, PageRequest.of(page, 10))
        .map(this::view);
  }

  @Transactional(readOnly = true)
  public Dto.BookingView get(Long user, Long id) {
    return view(owned(user, id));
  }

  private Booking owned(Long user, Long id) {
    Booking b = bookings.findById(id).orElseThrow(ApiException::missing);
    if (!b.getUserId().equals(user)) throw ApiException.missing();
    return b;
  }

  @Transactional
  public Dto.BookingView cancel(Long user, Long id) {
    Booking b = owned(user, id);
    flights.requireForUpdate(b.getFlightId());
    if (b.getStatus().equals("CANCELLED")) return view(b);
    if (!flights.require(b.getFlightId()).getDeparture().isAfter(Instant.now()))
      throw ApiException.bad("Departed flights cannot be cancelled");
    b.setStatus("CANCELLED");
    for (var s : seats.findByBookingId(id)) s.setBookingId(null);
    for (var bs : bookingSeats.findByBookingId(id)) bs.setActive(false);
    payments.findByBookingId(id).ifPresent(p -> p.setStatus("MOCK_REFUNDED"));
    seats.flush();
    events.changed(b.getFlightId());
    return view(b);
  }

  public Dto.BookingView view(Booking b) {
    return new Dto.BookingView(
        b.getId(),
        b.getPnr(),
        b.getStatus(),
        b.getTotal(),
        b.getCreatedAt(),
        flights.get(b.getFlightId()),
        passengers.findByBookingId(b.getId()).stream()
            .map(
                p ->
                    new Dto.PassengerView(
                        p.getName(),
                        p.getDateOfBirth(),
                        p.getSeatNumber(),
                        p.getBaggage(),
                        p.getMeal()))
            .toList());
  }
}
