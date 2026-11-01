package com.airline.reservation.repository;

import com.airline.reservation.domain.Airline;
import org.springframework.data.jpa.repository.*;

public interface AirlineRepository
    extends JpaRepository<Airline, Long>, JpaSpecificationExecutor<Airline> {}
