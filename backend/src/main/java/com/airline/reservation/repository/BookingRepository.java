package com.airline.reservation.repository;

import com.airline.reservation.domain.Booking;
import org.springframework.data.jpa.repository.*;

public interface BookingRepository
    extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {
  org.springframework.data.domain.Page<Booking> findByUserIdOrderByCreatedAtDesc(
      Long id, org.springframework.data.domain.Pageable page);

  java.util.Optional<Booking> findByRequestId(String id);
}
