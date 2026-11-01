package com.airline.reservation.repository;

import com.airline.reservation.domain.Flight;
import org.springframework.data.jpa.repository.*;

public interface FlightRepository
    extends JpaRepository<Flight, Long>, JpaSpecificationExecutor<Flight> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select f from Flight f where f.id = :id")
  java.util.Optional<Flight> locked(Long id);
}
