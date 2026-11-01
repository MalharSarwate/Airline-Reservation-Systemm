package com.airline.reservation.service;

import com.airline.reservation.api.*;
import com.airline.reservation.domain.*;
import com.airline.reservation.repository.*;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SeatService {
  private final FlightSeatRepository seats;
  private final SeatHoldRepository holds;
  private final FlightService flights;
  private final FareClassRepository fares;
  private final SeatEvents events;

  @Transactional(readOnly = true)
  public Dto.SeatMap map(Long id, Long user) {
    var f = flights.get(id);
    return new Dto.SeatMap(
        f,
        seats.findByFlightIdOrderByRowNumberAscColumnIndexAsc(id).stream()
            .map(s -> view(s, user, f))
            .toList());
  }

  public BigDecimal price(FlightSeat s, Flight f) {
    return f.getBasePrice()
        .multiply(fares.findById(s.getCabin()).orElseThrow(ApiException::missing).getMultiplier())
        .add(s.getSurcharge())
        .setScale(2, RoundingMode.HALF_UP);
  }

  private Dto.SeatView view(FlightSeat s, Long user, Dto.FlightView f) {
    boolean held = s.getHoldExpiresAt() != null && s.getHoldExpiresAt().isAfter(Instant.now());
    boolean mine = held && Objects.equals(user, s.getHoldUserId());
    String status =
        s.getBookingId() != null
            ? "OCCUPIED"
            : s.isBlocked() ? "BLOCKED" : held ? (mine ? "SELECTED" : "HELD") : "AVAILABLE";
    double[] xs =
        f.aircraft().columnsCount() == 6
            ? new double[] {-2.3, -1.5, -.7, .7, 1.5, 2.3}
            : new double[] {-3.3, -2.5, -1.1, -.35, .35, 1.1, 2.5, 3.3};
    return new Dto.SeatView(
        s.getId(),
        s.getSeatNumber(),
        s.getRowNumber(),
        s.getColumnIndex(),
        s.getCabin(),
        List.of(s.getFeatures().split(",")),
        f.basePrice()
            .multiply(
                fares.findById(s.getCabin()).orElseThrow(ApiException::missing).getMultiplier())
            .add(s.getSurcharge())
            .setScale(2),
        status,
        mine ? s.getHoldId() : null,
        mine ? s.getHoldExpiresAt() : null,
        xs[s.getColumnIndex()],
        0,
        (s.getRowNumber() - 1) * 1.3);
  }

  @Transactional
  public Dto.HoldView hold(Long user, Dto.HoldRequest in) {
    Flight f = flights.requireForUpdate(in.flightId());
    flights.bookable(f);
    FlightSeat s =
        seats
            .findByFlightIdAndSeatNumber(in.flightId(), in.seatNumber())
            .orElseThrow(ApiException::missing);
    if (s.isBlocked() || s.getBookingId() != null)
      throw ApiException.conflict("Seat is not available");
    boolean live = s.getHoldExpiresAt() != null && s.getHoldExpiresAt().isAfter(Instant.now());
    if (live) {
      if (!Objects.equals(s.getHoldUserId(), user))
        throw ApiException.conflict("Another traveller is holding this seat");
      return new Dto.HoldView(s.getHoldId(), s.getSeatNumber(), s.getHoldExpiresAt());
    }
    long owned =
        seats.findByFlightIdOrderByRowNumberAscColumnIndexAsc(in.flightId()).stream()
            .filter(
                x ->
                    Objects.equals(x.getHoldUserId(), user)
                        && x.getHoldExpiresAt() != null
                        && x.getHoldExpiresAt().isAfter(Instant.now()))
            .count();
    if (owned >= 6) throw ApiException.bad("At most six seats can be held per flight");
    String id = UUID.randomUUID().toString();
    Instant expiry = Instant.now().plusSeconds(600);
    s.setHoldId(id);
    s.setHoldUserId(user);
    s.setHoldExpiresAt(expiry);
    SeatHold h = new SeatHold();
    h.setId(id);
    h.setUserId(user);
    h.setFlightId(in.flightId());
    h.setSeatId(s.getId());
    h.setExpiresAt(expiry);
    holds.save(h);
    seats.saveAndFlush(s);
    events.changed(in.flightId());
    return new Dto.HoldView(id, s.getSeatNumber(), expiry);
  }

  @Transactional
  public List<Dto.HoldView> holdGroup(Long user, Dto.GroupHoldRequest in) {
    flights.requireForUpdate(in.flightId());
    if(in.seatNumbers().stream().distinct().count()!=in.seatNumbers().size())throw ApiException.bad("Each traveller needs a different seat");
    for(String id:in.releaseHoldIds()) {
      var seat=seats.findByHoldId(id).orElse(null);
      if(seat!=null && !seat.getFlightId().equals(in.flightId()))throw ApiException.bad("Hold belongs to a different flight");
      release(user,id);
    }
    List<Dto.HoldView> result=new ArrayList<>();
    for(String number:in.seatNumbers())result.add(hold(user,new Dto.HoldRequest(in.flightId(),number)));
    return result;
  }

  @Transactional
  public void release(Long user, String id) {
    FlightSeat s = seats.findByHoldId(id).orElse(null);
    if (s == null) return;
    if (!Objects.equals(s.getHoldUserId(), user)) throw ApiException.missing();
    clear(s);
    seats.saveAndFlush(s);
    events.changed(s.getFlightId());
  }

  public void clear(FlightSeat s) {
    s.setHoldId(null);
    s.setHoldUserId(null);
    s.setHoldExpiresAt(null);
  }

  @Scheduled(fixedDelay = 15000)
  @Transactional
  public void expire() {
    Instant now = Instant.now();
    for (FlightSeat s : seats.findByHoldExpiresAtBeforeAndBookingIdIsNull(now)) {
      clear(s);
      events.changed(s.getFlightId());
    }
    holds.deleteByExpiresAtBefore(now);
  }
}
