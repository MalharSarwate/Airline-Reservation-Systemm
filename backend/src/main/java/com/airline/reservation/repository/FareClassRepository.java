package com.airline.reservation.repository;

import com.airline.reservation.domain.FareClass;
import org.springframework.data.jpa.repository.*;

public interface FareClassRepository
    extends JpaRepository<FareClass, String>, JpaSpecificationExecutor<FareClass> {}
