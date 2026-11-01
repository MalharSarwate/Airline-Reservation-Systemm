package com.airline.reservation.repository;

import com.airline.reservation.domain.BookingSeat;
import org.springframework.data.jpa.repository.*;

public interface BookingSeatRepository
    extends JpaRepository<BookingSeat, Long>, JpaSpecificationExecutor<BookingSeat> {
  java.util.List<BookingSeat> findByBookingId(Long id);
}
