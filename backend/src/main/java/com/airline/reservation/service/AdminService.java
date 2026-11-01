package com.airline.reservation.service;

import com.airline.reservation.api.*;
import com.airline.reservation.domain.*;
import com.airline.reservation.repository.*;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {
  private final AircraftRepository aircraft;
  private final FlightRepository flights;
  private final AirportRepository airports;
  private final FlightSeatRepository seats;
  private final BookingRepository bookings;
  private final FlightService flightService;
  private final BookingService bookingService;
  private final SeatEvents events;

  @Transactional(readOnly = true)
  public List<Dto.AircraftView> aircraft() {
    return aircraft.findAll().stream().map(flightService::aircraftView).toList();
  }

  @Transactional
  public Dto.AircraftView addAircraft(Dto.AircraftInput in) {
    Aircraft a = new Aircraft();
    a.setType(in.type());
    a.setLayout(in.layout());
    a.setRows(in.rows());
    a.setColumnsCount(in.layout().equals("3-3") ? 6 : 8);
    return flightService.aircraftView(aircraft.save(a));
  }

  @Transactional
  public Dto.FlightView create(Dto.FlightInput in) {
    if (in.origin().equals(in.destination())
        || !airports.existsById(in.origin())
        || !airports.existsById(in.destination())
        || !in.arrival().isAfter(in.departure()))
      throw ApiException.bad("Check route and schedule");
    Aircraft a = aircraft.findById(in.aircraftId()).orElseThrow(ApiException::missing);
    Flight f = new Flight();
    f.setAircraftId(a.getId());
    f.setAirlineId(1L);
    f.setFlightNumber(in.flightNumber());
    f.setOrigin(in.origin());
    f.setDestination(in.destination());
    f.setDeparture(in.departure());
    f.setArrival(in.arrival());
    f.setBasePrice(in.basePrice());
    f.setStatus("SCHEDULED");
    flights.saveAndFlush(f);
    for (int row = 1; row <= a.getRows(); row++)
      for (int col = 0; col < a.getColumnsCount(); col++) {
        FlightSeat s = new FlightSeat();
        s.setFlightId(f.getId());
        s.setSeatNumber(row + String.valueOf((char) ('A' + col)));
        s.setRowNumber(row);
        s.setColumnIndex(col);
        s.setCabin(row == 1 ? "FIRST" : row <= 3 ? "BUSINESS" : row <= 5 ? "PREMIUM" : "ECONOMY");
        s.setFeatures(
            "POWER,"
                + (col == 0 || col == a.getColumnsCount() - 1 ? "WINDOW" : "AISLE_OR_MIDDLE")
                + (row == 10
                    ? ",EXIT_ROW,EXTRA_LEGROOM"
                    : row == a.getRows() ? ",NEAR_LAVATORY,LIMITED_RECLINE" : ""));
        s.setSurcharge(row == 10 ? new BigDecimal("900") : BigDecimal.ZERO);
        seats.save(s);
      }
    return flightService.view(f);
  }

  @Transactional
  public Dto.FlightView price(Long id, BigDecimal price) {
    if (price == null || price.compareTo(BigDecimal.ONE) < 0)
      throw ApiException.bad("Price must be positive");
    Flight f = flightService.requireForUpdate(id);
    ensureNoReservations(id);
    f.setBasePrice(price);
    events.changed(id);
    return flightService.view(f);
  }

  private void ensureNoReservations(Long id) {
    if (seats.findByFlightIdOrderByRowNumberAscColumnIndexAsc(id).stream()
        .anyMatch(
            s ->
                s.getBookingId() != null
                    || (s.getHoldExpiresAt() != null
                        && s.getHoldExpiresAt().isAfter(java.time.Instant.now()))))
      throw ApiException.conflict(
          "Flight has bookings or active holds; pricing and schedule are locked");
  }

  @Transactional
  public Dto.FlightView cancel(Long id) {
    Flight f = flightService.requireForUpdate(id);
    ensureNoReservations(id);
    f.setStatus("CANCELLED");
    events.changed(id);
    return flightService.view(f);
  }

  @Transactional
  public void seat(Long id, String number, Dto.SeatUpdate in) {
    flightService.requireForUpdate(id);
    var s = seats.findByFlightIdAndSeatNumber(id, number).orElseThrow(ApiException::missing);
    if (s.getBookingId() != null
        || s.getHoldExpiresAt() != null && s.getHoldExpiresAt().isAfter(java.time.Instant.now()))
      throw ApiException.conflict("Seat has an active reservation");
    s.setBlocked(in.blocked());
    s.setSurcharge(in.surcharge());
    seats.flush();
    events.changed(id);
  }

  @Transactional(readOnly = true)
  public Page<Dto.BookingView> bookings(int page) {
    if (page < 0) throw ApiException.bad("Invalid page");
    return bookings
        .findAll(PageRequest.of(page, 20, Sort.by("createdAt").descending()))
        .map(bookingService::view);
  }
}
