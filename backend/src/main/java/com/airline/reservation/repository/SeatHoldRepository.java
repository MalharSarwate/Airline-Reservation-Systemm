package com.airline.reservation.repository;

import com.airline.reservation.domain.SeatHold;
import org.springframework.data.jpa.repository.*;

public interface SeatHoldRepository
    extends JpaRepository<SeatHold, String>, JpaSpecificationExecutor<SeatHold> {
  void deleteByExpiresAtBefore(java.time.Instant now);
}
