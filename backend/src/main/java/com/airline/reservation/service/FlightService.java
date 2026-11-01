package com.airline.reservation.service;

import com.airline.reservation.api.*;
import com.airline.reservation.domain.*;
import com.airline.reservation.repository.*;
import jakarta.persistence.criteria.Predicate;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlightService {
  private final FlightRepository flights;
  private final AircraftRepository aircraft;
  private final AirlineRepository airlines;
  private final AirportRepository airports;
  private final FareClassRepository fares;
  private final ExtraRepository extras;
  private final FlightSeatRepository seats;

  public Page<Dto.FlightView> search(
      String origin,
      String destination,
      LocalDate date,
      int passengers,
      String cabin,
      String sort,
      int page) {
    if (passengers < 1
        || passengers > 6
        || page < 0
        || !List.of("ECONOMY", "PREMIUM", "BUSINESS", "FIRST").contains(cabin))
      throw ApiException.bad("Invalid search criteria");
    Instant start = date.atStartOfDay(ZoneOffset.UTC).toInstant(),
        end = start.plus(Duration.ofDays(1));
    Specification<Flight> spec =
        (root, q, cb) -> {
          List<Predicate> predicates = new ArrayList<>();
          predicates.add(cb.equal(root.get("status"), "SCHEDULED"));
          predicates.add(cb.greaterThan(root.get("departure"), Instant.now()));
          predicates.add(cb.greaterThanOrEqualTo(root.get("departure"), start));
          predicates.add(cb.lessThan(root.get("departure"), end));
          if (origin != null && !origin.isBlank())
            predicates.add(cb.equal(root.get("origin"), origin.toUpperCase(Locale.ROOT)));
          if (destination != null && !destination.isBlank())
            predicates.add(cb.equal(root.get("destination"), destination.toUpperCase(Locale.ROOT)));
          var sub = q.subquery(Long.class);
          var s = sub.from(FlightSeat.class);
          sub.select(cb.count(s));
          sub.where(
              cb.equal(s.get("flightId"), root.get("id")),
              cb.equal(s.get("cabin"), cabin),
              cb.isFalse(s.get("blocked")),
              cb.isNull(s.get("bookingId")),
              cb.or(
                  cb.isNull(s.get("holdExpiresAt")),
                  cb.lessThan(s.get("holdExpiresAt"), Instant.now())));
          predicates.add(cb.ge(sub, passengers));
          return cb.and(predicates.toArray(Predicate[]::new));
        };
    // Duration is represented by arrival minus departure; search results are bounded to a date.
    if ("duration".equals(sort)) {
      var all =
          flights.findAll(spec).stream()
              .sorted(Comparator.comparing(f -> Duration.between(f.getDeparture(), f.getArrival())))
              .toList();
      int from = Math.min(page * 12, all.size());
      return new PageImpl<>(
          all.subList(from, Math.min(from + 12, all.size())).stream().map(this::view).toList(),
          PageRequest.of(page, 12),
          all.size());
    }
    String field =
        switch (sort) {
          case "price" -> "basePrice";
          case "departure" -> "departure";
          default -> throw ApiException.bad("Unknown sorting option");
        };
    return flights
        .findAll(spec, PageRequest.of(page, 12, Sort.by(field).and(Sort.by("id"))))
        .map(this::view);
  }

  public Flight require(Long id) {
    return flights.findById(id).orElseThrow(ApiException::missing);
  }

  public Flight requireForUpdate(Long id) {
    return flights.locked(id).orElseThrow(ApiException::missing);
  }

  public void bookable(Flight f) {
    if (!"SCHEDULED".equals(f.getStatus()) || !f.getDeparture().isAfter(Instant.now()))
      throw ApiException.conflict("Flight is no longer open for booking");
  }

  public Dto.FlightView get(Long id) {
    return view(require(id));
  }

  public Dto.AircraftView aircraftView(Aircraft a) {
    return new Dto.AircraftView(
        a.getId(), a.getType(), a.getLayout(), a.getRows(), a.getColumnsCount());
  }

  public Dto.FlightView view(Flight f) {
    Aircraft a = aircraft.findById(f.getAircraftId()).orElseThrow(ApiException::missing);
    return new Dto.FlightView(
        f.getId(),
        f.getFlightNumber(),
        f.getOrigin(),
        f.getDestination(),
        f.getDeparture(),
        f.getArrival(),
        f.getBasePrice(),
        f.getStatus(),
        aircraftView(a),
        airlines.findById(f.getAirlineId()).orElseThrow(ApiException::missing).getName());
  }

  public List<Dto.AirportView> airports() {
    return airports.findAll(Sort.by("city")).stream()
        .map(a -> new Dto.AirportView(a.getCode(), a.getCity(), a.getName()))
        .toList();
  }

  public List<Dto.FareView> fares() {
    return fares.findAll().stream()
        .map(f -> new Dto.FareView(f.getCode(), f.getMultiplier(), f.getBaggage()))
        .toList();
  }

  public List<Dto.ExtraView> extras() {
    return extras.findAll().stream()
        .map(e -> new Dto.ExtraView(e.getCode(), e.getName(), e.getKind(), e.getPrice()))
        .toList();
  }
}
