package com.airline.reservation.repository;

import com.airline.reservation.domain.Payment;
import org.springframework.data.jpa.repository.*;

public interface PaymentRepository
    extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
  java.util.Optional<Payment> findByBookingId(Long id);
}
