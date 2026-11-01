package com.airline.reservation.repository;

import com.airline.reservation.domain.FlightSeat;
import org.springframework.data.jpa.repository.*;

public interface FlightSeatRepository
    extends JpaRepository<FlightSeat, Long>, JpaSpecificationExecutor<FlightSeat> {
  java.util.List<FlightSeat> findByFlightIdOrderByRowNumberAscColumnIndexAsc(Long id);

  java.util.Optional<FlightSeat> findByFlightIdAndSeatNumber(Long flightId, String seatNumber);

  java.util.List<FlightSeat> findByBookingId(Long id);

  java.util.List<FlightSeat> findByHoldExpiresAtBeforeAndBookingIdIsNull(java.time.Instant now);

  java.util.Optional<FlightSeat> findByHoldId(String id);
}
