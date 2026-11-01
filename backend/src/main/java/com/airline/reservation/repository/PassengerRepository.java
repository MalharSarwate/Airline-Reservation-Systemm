package com.airline.reservation.repository;

import com.airline.reservation.domain.Passenger;
import org.springframework.data.jpa.repository.*;

public interface PassengerRepository
    extends JpaRepository<Passenger, Long>, JpaSpecificationExecutor<Passenger> {
  java.util.List<Passenger> findByBookingId(Long id);
}
