package com.airline.reservation.repository;

import com.airline.reservation.domain.Airport;
import org.springframework.data.jpa.repository.*;

public interface AirportRepository
    extends JpaRepository<Airport, String>, JpaSpecificationExecutor<Airport> {}
