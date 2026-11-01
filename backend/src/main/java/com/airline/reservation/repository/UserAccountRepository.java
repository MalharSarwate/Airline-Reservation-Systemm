package com.airline.reservation.repository;

import com.airline.reservation.domain.UserAccount;
import org.springframework.data.jpa.repository.*;

public interface UserAccountRepository
    extends JpaRepository<UserAccount, Long>, JpaSpecificationExecutor<UserAccount> {
  java.util.Optional<UserAccount> findByEmail(String email);
}
