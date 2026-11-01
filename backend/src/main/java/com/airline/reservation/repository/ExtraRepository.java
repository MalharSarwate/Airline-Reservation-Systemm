package com.airline.reservation.repository;

import com.airline.reservation.domain.Extra;
import org.springframework.data.jpa.repository.*;

public interface ExtraRepository
    extends JpaRepository<Extra, String>, JpaSpecificationExecutor<Extra> {}
