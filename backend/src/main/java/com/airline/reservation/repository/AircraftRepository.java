package com.airline.reservation.repository;

import com.airline.reservation.domain.Aircraft;
import org.springframework.data.jpa.repository.*;

public interface AircraftRepository
    extends JpaRepository<Aircraft, Long>, JpaSpecificationExecutor<Aircraft> {}
